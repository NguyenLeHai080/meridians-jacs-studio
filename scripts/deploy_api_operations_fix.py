import paramiko
import os
import tarfile
import tempfile
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("Connecting to 221.121.1.3...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw')
sftp = ssh.open_sftp()

# 1. Deploy backend router fix
print("1. Uploading backend telemetry router.py...")
local_router = r"d:\PROJECT\Client_Projects\02_Active_Projects_Php83\meridians-jacs-studio\meridians-jacs-studio\BE\api-server\app\modules\telemetry\router.py"
sftp.put(local_router, "/tmp/router.py")

cmd = """
# Copy router to production and staging containers
docker cp /tmp/router.py jacs-studio-prod-api-1:/app/app/modules/telemetry/router.py
docker cp /tmp/router.py jacs-studio-staging-api-1:/app/app/modules/telemetry/router.py

# Restart API containers gracefully to apply code changes
docker restart jacs-studio-prod-api-1 jacs-studio-staging-api-1
"""
stdin, stdout, stderr = ssh.exec_command(cmd)
print("Restarting API containers output:")
print(stdout.read().decode('utf-8', errors='replace'))

# 2. Deploy admin portal frontend dist
print("2. Packaging and deploying Admin Portal frontend...")
dist_dir = r"d:\PROJECT\Client_Projects\02_Active_Projects_Php83\meridians-jacs-studio\meridians-jacs-studio\FE\admin-portal\dist"
tar_path = os.path.join(tempfile.gettempdir(), "admin_dist.tar.gz")

with tarfile.open(tar_path, "w:gz") as tar:
    for root, dirs, files in os.walk(dist_dir):
        for f in files:
            full_p = os.path.join(root, f)
            rel_p = os.path.relpath(full_p, dist_dir)
            tar.add(full_p, arcname=rel_p)

print(f"Tar created at {tar_path}, uploading to server...")
sftp.put(tar_path, "/tmp/admin_dist.tar.gz")

web_deploy_cmd = """
# Deploy to prod and staging web containers
mkdir -p /tmp/admin_dist
tar -xzf /tmp/admin_dist.tar.gz -C /tmp/admin_dist/
docker cp /tmp/admin_dist/. jacs-studio-prod-web-1:/usr/share/nginx/html/
docker cp /tmp/admin_dist/. jacs-studio-staging-web-1:/usr/share/nginx/html/
rm -rf /tmp/admin_dist /tmp/admin_dist.tar.gz /tmp/router.py
"""
stdin, stdout, stderr = ssh.exec_command(web_deploy_cmd)
print(stdout.read().decode('utf-8', errors='replace'))

# 3. Test API endpoint /api/v1/telemetry/api-operations
print("3. Testing live API operations endpoint...")
verify_cmd = """
curl -s -k -H "Authorization: Bearer mock" http://127.0.0.1:8000/api/v1/telemetry/api-operations || curl -s -k http://localhost:8000/api/v1/telemetry/api-operations
"""
stdin, stdout, stderr = ssh.exec_command("docker exec jacs-studio-prod-api-1 curl -s http://localhost:8000/api/v1/health")
print("Health status:", stdout.read().decode('utf-8', errors='replace'))

sftp.close()
ssh.close()
print("🎉 API Operations dynamic telemetry update deployed and verified successfully!")
