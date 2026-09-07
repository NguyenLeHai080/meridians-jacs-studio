import subprocess
import os

exe = r"C:\Users\NguyenLeHai\AppData\Local\Programs\jacs-studio\JACS Studio.exe"
print("Exists:", os.path.exists(exe))

try:
    p = subprocess.Popen([exe], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = p.communicate(timeout=5)
    print("STDOUT:", stdout.decode('utf-8', errors='ignore'))
    print("STDERR:", stderr.decode('utf-8', errors='ignore'))
    print("CODE:", p.returncode)
except subprocess.TimeoutExpired:
    print("Process is running normally in background!")
except Exception as e:
    print("Exception:", e)
