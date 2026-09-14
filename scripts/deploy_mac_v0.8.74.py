import os
import sys
import time
import json
import hashlib
import paramiko

VERSION = "0.8.74"
NOTES = "Bản cập nhật v0.8.74 macOS Universal (Apple Silicon & Intel): Đồng bộ toàn diện tính năng & hiệu năng với Windows — Tối ưu triệt để Bàn Dựng Timeline & Playhead 60 FPS, giảm 90% tải render; Nâng cấp thuật toán AI Stem Isolation phân mảnh RAM thấp (<50MB) kèm thanh tiến độ (%) và ETA; Tối ưu FFmpeg pipeline nền mượt mà."

RELEASE_DIR = "FE/desktop-app/release"
ZIP_PATH = os.path.join(RELEASE_DIR, "jacs-studio-0.8.74-macos-universal.zip")
DMG_PATH = os.path.join(RELEASE_DIR, "jacs-studio-0.8.74-macos-universal.dmg")

if not os.path.exists(ZIP_PATH) or not os.path.exists(DMG_PATH):
    print("LỖI: Không tìm thấy file zip hoặc dmg trong", RELEASE_DIR)
    sys.exit(1)

zip_size = os.path.getsize(ZIP_PATH)
with open(ZIP_PATH, "rb") as f:
    zip_sha512 = hashlib.sha512(f.read()).hexdigest()

dmg_size = os.path.getsize(DMG_PATH)
with open(DMG_PATH, "rb") as f:
    dmg_sha512 = hashlib.sha512(f.read()).hexdigest()

download_url = f"https://jacs-studio.nexoratech.com.vn/downloads/jacs-studio-{VERSION}-macos-universal.zip"
dmg_url = f"https://jacs-studio.nexoratech.com.vn/downloads/jacs-studio-{VERSION}-macos-universal.dmg"

print("==================================================")
print(f"   DEPLOY JACS STUDIO MACOS UNIVERSAL v{VERSION}")
print("==================================================")
print(f"ZIP: {os.path.basename(ZIP_PATH)} ({zip_size / (1024*1024):.2f} MB)")
print(f"DMG: {os.path.basename(DMG_PATH)} ({dmg_size / (1024*1024):.2f} MB)")

SERVER = "221.121.1.3"
USER = "root"
PASS = "4fT0R%GUJgh@a9Vw"

print(f"\n[1/3] Kết nối SSH tới server {SERVER}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, port=22, username=USER, password=PASS, timeout=30)
sftp = ssh.open_sftp()

REMOTE_DOWNLOADS = "/opt/jacs-studio/downloads"
ssh.exec_command(f"mkdir -p {REMOTE_DOWNLOADS}")

print(f"\n[2/3] Đang upload file lên server...")
def progress_callback(filename):
    last_pct = [0]
    def cb(transferred, total):
        pct = int(transferred / total * 100)
        if pct >= last_pct[0] + 20 or pct == 100:
            last_pct[0] = pct
            print(f"  {filename}: {pct}% ({transferred / (1024*1024):.1f}/{total / (1024*1024):.1f} MB)")
    return cb

print(f"Uploading {os.path.basename(ZIP_PATH)}...")
sftp.put(ZIP_PATH, f"{REMOTE_DOWNLOADS}/{os.path.basename(ZIP_PATH)}", callback=progress_callback(os.path.basename(ZIP_PATH)))

print(f"Uploading {os.path.basename(DMG_PATH)}...")
sftp.put(DMG_PATH, f"{REMOTE_DOWNLOADS}/{os.path.basename(DMG_PATH)}", callback=progress_callback(os.path.basename(DMG_PATH)))

print("✓ Upload hoàn tất.")

print(f"\n[3/3] Đăng ký bản phát hành vào PostgreSQL...")
now_iso = time.strftime("%Y-%m-%dT%H:%M:%S.000000+00:00", time.gmtime())

release_record = {
    "id": f"rel-v{VERSION}-mac",
    "version": VERSION,
    "platform": "macos",
    "channel": "stable",
    "download_url": download_url,
    "url": download_url,
    "sha512": zip_sha512,
    "size": zip_size,
    "file_size": zip_size,
    "notes": NOTES,
    "release_notes": NOTES,
    "is_mandatory": True,
    "force_update": True,
    "status": "published",
    "mandatory": True,
    "published_at": now_iso,
    "created_at": now_iso,
}

sql_content = f"""
INSERT INTO jacs_records (collection, id, data, created_at, updated_at) 
VALUES ('releases', '{release_record["id"]}', '{json.dumps(release_record).replace("'", "''")}'::jsonb, NOW(), NOW()) 
ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
"""

with sftp.file(f"/tmp/insert_v{VERSION}_mac.sql", "w") as f:
    f.write(sql_content)

# Update Prod DB
stdin, stdout, stderr = ssh.exec_command(f"docker exec -i jacs-studio-prod-postgres-1 psql -U jacs_prod -d jacs_studio_prod < /tmp/insert_v{VERSION}_mac.sql")
print("Prod DB Result:", stdout.read().decode('utf-8').strip())

# Update Staging DB
stdin, stdout, stderr = ssh.exec_command(f"docker exec -i jacs-studio-staging-postgres-1 psql -U jacs_staging -d jacs_studio_staging < /tmp/insert_v{VERSION}_mac.sql")
print("Staging DB Result:", stdout.read().decode('utf-8').strip())

sftp.close()
ssh.close()

# Also update Local DB if running
try:
    from app.core.store import store
    store.create("releases", release_record)
    print("✓ Local DB: Đã đăng ký bản macOS v0.8.74 thành công.")
except Exception as e:
    print("Local DB notice:", e)

print("\n🎉 HOÀN TẤT PHÁT HÀNH JACS STUDIO MACOS v" + VERSION)
