#!/bin/bash
# jade-sync.sh — Reusable session setup and GitHub sync for Jade
# 
# This script handles the ephemeral container problem: each Claude session
# starts fresh with no SSH keys, no git config, no auth. This script
# rebuilds everything needed to sync with GitHub in one command.
#
# USAGE:
#   From Claude container:  ./scripts/jade-sync.sh setup    # Generate keys + configure
#   From Claude container:  ./scripts/jade-sync.sh bundle   # Create downloadable git bundle
#   From Claude container:  ./scripts/jade-sync.sh push     # Attempt direct push (may fail due to network)
#   From your machine:      ./scripts/jade-sync.sh unbundle # Clone from bundle + push to GitHub
#
# KNOWN CONSTRAINTS (discovered 2026-02-24, Session 1):
#   - Claude's container can reach github.com over HTTPS (read) but NOT SSH
#   - HTTPS push requires interactive auth (no PAT storage between sessions)
#   - SSH DNS resolution blocked at container network level
#   - Container filesystem resets between sessions (keys are ephemeral)
#   - Workaround: git bundle → download → push from local machine
#
# JADE SLASH COMMAND: /jade-sync [setup|bundle|push|unbundle]

set -euo pipefail

REPO_DIR="${JADE_REPO_DIR:-/home/claude/jade-frontier-journal}"
BUNDLE_PATH="${JADE_BUNDLE_PATH:-/mnt/user-data/outputs/jade-frontier-journal.bundle}"
SSH_KEY_PATH="/home/claude/.ssh/jade_deploy_key"
GIT_USER="alex-jadecli"
GIT_EMAIL="jade@jadecli.com"
GITHUB_REPO="jadecli-labs/jade-frontier-journal"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[jade]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[jade]${NC} $1"; }
log_error() { echo -e "${RED}[jade]${NC} $1"; }

cmd_setup() {
    log_info "Setting up Jade session environment..."

    # Git config
    cd "$REPO_DIR"
    git config user.name "$GIT_USER"
    git config user.email "$GIT_EMAIL"
    log_info "Git identity: $GIT_USER <$GIT_EMAIL>"

    # SSH key generation
    if [ ! -f "$SSH_KEY_PATH" ]; then
        log_info "Generating ephemeral SSH deploy key..."
        mkdir -p "$(dirname "$SSH_KEY_PATH")"
        ssh-keygen -t ed25519 -C "$GIT_EMAIL" -f "$SSH_KEY_PATH" -N "" -q

        # SSH config
        cat > /home/claude/.ssh/config << EOF
Host github.com
  HostName github.com
  User git
  IdentityFile $SSH_KEY_PATH
  StrictHostKeyChecking no
EOF
        chmod 600 /home/claude/.ssh/config "$SSH_KEY_PATH"
        
        log_warn "NEW DEPLOY KEY generated (ephemeral — will not survive session reset)"
        echo ""
        log_info "Public key to add at https://github.com/$GITHUB_REPO/settings/keys :"
        echo ""
        cat "${SSH_KEY_PATH}.pub"
        echo ""
        log_warn "Check 'Allow write access' when adding the deploy key"
    else
        log_info "SSH key already exists for this session"
    fi

    # Install openssh-client if missing
    if ! command -v ssh &> /dev/null; then
        log_info "Installing openssh-client..."
        apt-get update -qq && apt-get install -y -qq openssh-client 2>&1 | tail -1
    fi

    # Set remote
    if git remote get-url origin &>/dev/null; then
        git remote set-url origin "git@github.com:${GITHUB_REPO}.git"
    else
        git remote add origin "git@github.com:${GITHUB_REPO}.git"
    fi
    log_info "Remote set to git@github.com:${GITHUB_REPO}.git"

    # Test connectivity
    log_info "Testing GitHub connectivity..."
    if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
        log_info "SSH auth: SUCCESS"
    elif curl -s https://github.com -o /dev/null -w "%{http_code}" | grep -q "200"; then
        log_warn "SSH blocked (container network constraint) — HTTPS reachable"
        log_warn "Use 'jade-sync bundle' to create a downloadable git bundle instead"
    else
        log_error "No connectivity to GitHub"
    fi

    echo ""
    log_info "Setup complete. Run 'jade-sync push' or 'jade-sync bundle'"
}

cmd_bundle() {
    log_info "Creating git bundle for manual sync..."
    cd "$REPO_DIR"

    # Verify there are commits to bundle
    if ! git rev-parse HEAD &>/dev/null; then
        log_error "No commits to bundle. Stage and commit first."
        exit 1
    fi

    git bundle create "$BUNDLE_PATH" --all
    BUNDLE_SIZE=$(du -h "$BUNDLE_PATH" | cut -f1)
    COMMIT_COUNT=$(git rev-list --count --all)
    LATEST_MSG=$(git log -1 --pretty=format:"%s")

    log_info "Bundle created: $BUNDLE_PATH ($BUNDLE_SIZE)"
    log_info "Contains $COMMIT_COUNT commit(s), latest: '$LATEST_MSG'"
    echo ""
    log_info "To sync from your machine:"
    echo "  git clone jade-frontier-journal.bundle jade-frontier-journal"
    echo "  cd jade-frontier-journal"
    echo "  git remote set-url origin https://github.com/$GITHUB_REPO.git"
    echo "  git push -u origin main"
}

cmd_push() {
    log_info "Attempting direct push to GitHub..."
    cd "$REPO_DIR"

    # Try SSH first
    if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
        git remote set-url origin "git@github.com:${GITHUB_REPO}.git"
        git push -u origin main
        log_info "Push successful via SSH"
    else
        log_warn "SSH unavailable. Trying HTTPS..."
        git remote set-url origin "https://github.com/${GITHUB_REPO}.git"
        if git push -u origin main 2>&1; then
            log_info "Push successful via HTTPS"
        else
            log_error "Push failed. Container network blocks authenticated git operations."
            log_warn "Falling back to bundle..."
            cmd_bundle
        fi
    fi
}

cmd_unbundle() {
    # This runs on the HUMAN's machine, not in Claude's container
    BUNDLE_FILE="${1:-jade-frontier-journal.bundle}"
    
    if [ ! -f "$BUNDLE_FILE" ]; then
        log_error "Bundle file not found: $BUNDLE_FILE"
        log_info "Download it from Claude's outputs first"
        exit 1
    fi

    log_info "Cloning from bundle..."
    git clone "$BUNDLE_FILE" jade-frontier-journal
    cd jade-frontier-journal
    git remote set-url origin "https://github.com/${GITHUB_REPO}.git"
    
    log_info "Pushing to GitHub..."
    git push -u origin main
    log_info "Sync complete! Repo live at https://github.com/$GITHUB_REPO"
}

cmd_status() {
    log_info "Jade session status:"
    cd "$REPO_DIR" 2>/dev/null || { log_error "Repo not found at $REPO_DIR"; exit 1; }
    
    echo "  Repo:     $REPO_DIR"
    echo "  Remote:   $(git remote get-url origin 2>/dev/null || echo 'not set')"
    echo "  Branch:   $(git branch --show-current)"
    echo "  Commits:  $(git rev-list --count --all 2>/dev/null || echo '0')"
    echo "  Staged:   $(git diff --cached --numstat | wc -l) files"
    echo "  Modified: $(git diff --numstat | wc -l) files"
    echo "  SSH key:  $([ -f "$SSH_KEY_PATH" ] && echo 'present (ephemeral)' || echo 'not generated')"
    echo "  Network:  $(curl -s https://github.com -o /dev/null -w '%{http_code}' 2>/dev/null || echo 'unknown') (HTTPS)"
}

# Route commands
case "${1:-help}" in
    setup)    cmd_setup ;;
    bundle)   cmd_bundle ;;
    push)     cmd_push ;;
    unbundle) cmd_unbundle "${2:-}" ;;
    status)   cmd_status ;;
    help|*)
        echo "jade-sync — Ephemeral session sync for jade-frontier-journal"
        echo ""
        echo "Commands:"
        echo "  setup     Generate SSH keys, configure git, test connectivity"
        echo "  bundle    Create downloadable git bundle (workaround for blocked SSH)"
        echo "  push      Attempt direct push (SSH → HTTPS → fallback to bundle)"
        echo "  unbundle  [file]  Clone from bundle and push (run on YOUR machine)"
        echo "  status    Show current session state"
        echo ""
        echo "Slash command: /jade-sync [command]"
        ;;
esac
