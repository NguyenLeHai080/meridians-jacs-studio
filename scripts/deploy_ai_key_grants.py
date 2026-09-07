import paramiko, tarfile, os, io

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('221.121.1.3', username='root', password='4fT0R%GUJgh@a9Vw', timeout=15)

print("1. Uploading backend licensing schemas and router...")
sftp = ssh.open_sftp()
sftp.put(
    r'd:\PROJECT\Client_Projects\02_Active_Projects_Php83\meridians-jacs-studio\meridians-jacs-studio\BE\api-server\app\modules\licensing\schemas.py',
    '/tmp/lic_schemas.py'
)
sftp.put(
    r'd:\PROJECT\Client_Projects\02_Active_Projects_Php83\meridians-jacs-studio\meridians-jacs-studio\BE\api-server\app\modules\licensing\router.py',
    '/tmp/lic_router.py'
)
sftp.close()

ssh.exec_command(
    'docker cp /tmp/lic_schemas.py jacs-studio-prod-api-1:/app/app/modules/licensing/schemas.py && '
    'docker cp /tmp/lic_router.py jacs-studio-prod-api-1:/app/app/modules/licensing/router.py && '
    'docker cp /tmp/lic_schemas.py jacs-studio-staging-api-1:/app/app/modules/licensing/schemas.py && '
    'docker cp /tmp/lic_router.py jacs-studio-staging-api-1:/app/app/modules/licensing/router.py && '
    'docker restart jacs-studio-prod-api-1 jacs-studio-staging-api-1'
)

print("2. Packaging Admin Portal frontend...")
tar_buf = io.BytesIO()
with tarfile.open(fileobj=tar_buf, mode="w:gz") as tar:
    dist_dir = r'd:\PROJECT\Client_Projects\02_Active_Projects_Php83\meridians-jacs-studio\meridians-jacs-studio\FE\admin-portal\dist'
    for root, dirs, files in os.walk(dist_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, dist_dir)
            tar.add(full_path, arcname=rel_path)

tar_bytes = tar_buf.getvalue()

sftp = ssh.open_sftp()
with sftp.file('/tmp/admin_portal_dist.tar.gz', 'wb') as f:
    f.write(tar_bytes)
sftp.close()

print("3. Deploying Admin Portal to web container...")
stdin, stdout, stderr = ssh.exec_command(
    'mkdir -p /tmp/admin_dist && '
    'tar -xzf /tmp/admin_portal_dist.tar.gz -C /tmp/admin_dist && '
    'docker cp /tmp/admin_dist/. jacs-studio-prod-web-1:/usr/share/nginx/html/ && '
    'docker cp /tmp/admin_dist/. jacs-studio-staging-web-1:/usr/share/nginx/html/ && '
    'rm -rf /tmp/admin_dist /tmp/admin_portal_dist.tar.gz'
)
print("Deploy stdout:", stdout.read().decode('utf-8'))
print("Deploy stderr:", stderr.read().decode('utf-8'))

ssh.close()
print("🎉 AI Key Grants feature successfully deployed!")
