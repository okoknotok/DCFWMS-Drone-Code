#!/usr/bin/env python3
"""
Deploy: bundle + commit + push 到 GitHub Pages
用法: python3 deploy.py [commit message]

GitHub Pages 設定:
  Settings → Pages → Source: Deploy from a branch
  Branch: main → /dist (或 /docs)
"""
import subprocess, sys
from pathlib import Path

msg = ' '.join(sys.argv[1:]) if len(sys.argv) > 1 else 'Update & deploy'

# 1. Bundle
print("📦 Bundling...")
subprocess.run([sys.executable, 'bundle.py'], check=True)

# 2. Commit bundled dist/
print("🚀 Deploying...")
subprocess.run(['git', 'add', '-A'], check=True)
result = subprocess.run(
    ['git', 'commit', '-m', msg],
    capture_output=True, text=True
)
if result.returncode != 0 and 'nothing to commit' in result.stderr:
    print("⚠️  No changes to commit")
    sys.exit(0)
elif result.returncode != 0:
    print(result.stderr)
    sys.exit(1)

subprocess.run(['git', 'push'], check=True)
print("✅ Deployed! GitHub Pages will update shortly.")
