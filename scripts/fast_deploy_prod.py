import os
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

HOST = "221.121.1.3"
PORT = 22
USER = "root"
PASSWORD = "4fT0R%GUJgh@a9Vw"

ROOT_DIR = r"d:\PROJECT\Client_Projects\meridians-jacs-studio"

def deploy_fast():
    print("🚀 Bắt đầu Fast Deploy lên server...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, PORT, USER, PASSWORD, timeout=20)
    sftp = ssh.open_sftp()

    # 1. Upload Backend telemetry router & schemas
    print("1. Đồng bộ Backend API code...")
    sftp.put(os.path.join(ROOT_DIR, "BE", "api-server", "app", "modules", "telemetry", "schemas.py"), "/tmp/telemetry_schemas.py")
    sftp.put(os.path.join(ROOT_DIR, "BE", "api-server", "app", "modules", "telemetry", "router.py"), "/tmp/telemetry_router.py")
    sftp.put(os.path.join(ROOT_DIR, "BE", "api-server", "app", "modules", "ai_providers", "router.py"), "/tmp/ai_providers_router.py")

    cmd_be = """
docker cp /tmp/telemetry_schemas.py jacs-studio-prod-api-1:/app/app/modules/telemetry/schemas.py
docker cp /tmp/telemetry_router.py jacs-studio-prod-api-1:/app/app/modules/telemetry/router.py
docker cp /tmp/ai_providers_router.py jacs-studio-prod-api-1:/app/app/modules/ai_providers/router.py

docker cp /tmp/telemetry_schemas.py jacs-studio-staging-api-1:/app/app/modules/telemetry/schemas.py
docker cp /tmp/telemetry_router.py jacs-studio-staging-api-1:/app/app/modules/telemetry/router.py
docker cp /tmp/ai_providers_router.py jacs-studio-staging-api-1:/app/app/modules/ai_providers/router.py

docker restart jacs-studio-prod-api-1 jacs-studio-staging-api-1
"""
    stdin, stdout, stderr = ssh.exec_command(cmd_be)
    print(stdout.read().decode('utf-8'))

    # 2. Upload Admin Portal built dist
    print("2. Đồng bộ Admin Portal frontend...")
    dist_dir = os.path.join(ROOT_DIR, "FE", "admin-portal", "dist")
    
    # Tar the dist directory locally for fast transfer
    import tarfile, tempfile
    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        tmp_dist = tmp.name
    
    with tarfile.open(tmp_dist, "w:gz") as tar:
        tar.add(dist_dir, arcname=".")
    
    sftp.put(tmp_dist, "/tmp/admin_dist.tar.gz")
    os.remove(tmp_dist)

    cmd_fe = """
mkdir -p /tmp/admin_dist
rm -rf /tmp/admin_dist/*
tar -xzf /tmp/admin_dist.tar.gz -C /tmp/admin_dist

docker cp /tmp/admin_dist/. jacs-studio-prod-web-1:/usr/share/nginx/html/
docker cp /tmp/admin_dist/. jacs-studio-staging-web-1:/usr/share/nginx/html/

docker restart jacs-studio-prod-web-1 jacs-studio-staging-web-1
"""
    stdin, stdout, stderr = ssh.exec_command(cmd_fe)
    print(stdout.read().decode('utf-8'))

    sftp.close()
    ssh.close()
    print("✅ Fast Deploy Backend & Admin Portal THÀNH CÔNG!")

if __name__ == "__main__":
    deploy_fast()
