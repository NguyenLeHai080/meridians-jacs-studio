import os
import sys
import tarfile
import tempfile
import paramiko
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

HOST = "221.121.1.3"
PORT = 22
USER = "root"
PASSWORD = "4fT0R%GUJgh@a9Vw"

EXCLUDE_DIRS = {
    '.git', 'node_modules', '.pnpm-store', '.pytest_cache',
    '.ruff_cache', '__pycache__', '.venv', 'dist_temp'
}
EXCLUDE_EXTS = {'.tsbuildinfo', '.pyc'}

def make_tarball(source_dir, output_file):
    def filter_func(tarinfo):
        parts = tarinfo.name.split('/')
        for p in parts:
            if p in EXCLUDE_DIRS:
                return None
        _, ext = os.path.splitext(tarinfo.name)
        if ext in EXCLUDE_EXTS:
            return None
        return tarinfo

    with tarfile.open(output_file, "w:gz") as tar:
        for item in os.listdir(source_dir):
            if item in EXCLUDE_DIRS:
                continue
            item_path = os.path.join(source_dir, item)
            tar.add(item_path, arcname=item, filter=filter_func)

def deploy():
    print(f"🚀 Deploying PROD to {HOST}...")
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        print("1. Creating tarball...")
        make_tarball(root_dir, tmp_path)
        print(f"   Tarball size: {os.path.getsize(tmp_path) / (1024*1024):.2f} MB")

        print("2. Connecting SSH...")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(HOST, PORT, USER, PASSWORD, timeout=20)

        sftp = client.open_sftp()
        remote_tar = f"/tmp/jacs_prod_{int(datetime.now().timestamp())}.tar.gz"
        print(f"3. Uploading to {remote_tar}...")
        sftp.put(tmp_path, remote_tar)
        sftp.close()

        release_dir = "/opt/jacs-studio/prod/current"
        print(f"4. Deploying on server...")
        cmd = f"""
mkdir -p {release_dir}
find {release_dir} -mindepth 1 -maxdepth 1 -not -name '.env' -exec rm -rf -- {{}} +
tar -xzf {remote_tar} -C {release_dir}
rm -f {remote_tar}
cd {release_dir}
docker compose -f deploy/docker-compose.prod.yml up -d --build
"""
        stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        print("=== DEPLOY OUTPUT ===")
        print(out)
        if err:
            print("=== STDERR / LOGS ===")
            print(err)

        stdin, stdout, stderr = client.exec_command("docker ps --filter 'name=jacs-studio-prod'")
        print("=== RUNNING CONTAINERS ===")
        print(stdout.read().decode('utf-8', errors='replace'))

        client.close()
        print("✅ Deploy completed successfully!")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == "__main__":
    deploy()
