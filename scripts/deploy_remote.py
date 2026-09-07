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

def deploy_env(env_name):
    print(f"\n==========================================")
    print(f"🚀 Deploying to {env_name.upper()} on {HOST}...")
    print(f"==========================================")

    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    
    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        print("1. Creating compressed deployment package...")
        make_tarball(root_dir, tmp_path)
        pkg_size_mb = os.path.getsize(tmp_path) / (1024 * 1024)
        print(f"   Package size: {pkg_size_mb:.2f} MB")

        print("2. Connecting to server via SSH...")
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(HOST, PORT, USER, PASSWORD, timeout=15)

        sftp = client.open_sftp()
        remote_tar = f"/tmp/jacs_{env_name}_{int(datetime.now().timestamp())}.tar.gz"
        print(f"3. Uploading release archive to {remote_tar}...")
        sftp.put(tmp_path, remote_tar)
        sftp.close()

        release_dir = f"/opt/jacs-studio/{env_name}/current"
        print(f"4. Extracting archive to {release_dir}...")
        cmds = [
            f"mkdir -p {release_dir}",
            f"find {release_dir} -mindepth 1 -maxdepth 1 -not -name '.env' -exec rm -rf -- {{}} +",
            f"tar -xzf {remote_tar} -C {release_dir}",
            f"rm -f {remote_tar}",
            f"chmod +x {release_dir}/deploy/deploy.sh",
            f"bash {release_dir}/deploy/deploy.sh {env_name} {release_dir}"
        ]
        deploy_cmd = " && ".join(cmds)
        
        print("5. Executing deploy.sh script and container rebuilds...")
        stdin, stdout, stderr = client.exec_command(deploy_cmd)
        
        for line in stdout:
            print(line, end="")
        for line in stderr:
            print(f"[ERR] {line}", end="")
            
        exit_status = stdout.channel.recv_exit_status()
        client.close()
        
        if exit_status == 0:
            print(f"\n✅ {env_name.upper()} deployment SUCCEEDED!")
            return True
        else:
            print(f"\n❌ {env_name.upper()} deployment FAILED with status code {exit_status}!")
            return False

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

if __name__ == '__main__':
    targets = sys.argv[1:] if len(sys.argv) > 1 else ['staging', 'prod']
    success = True
    for t in targets:
        if not deploy_env(t):
            success = False
            break
    sys.exit(0 if success else 1)
