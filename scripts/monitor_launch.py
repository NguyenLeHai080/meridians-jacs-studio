import subprocess
import time

exe = r"C:\Users\NguyenLeHai\AppData\Local\Programs\jacs-studio\JACS Studio.exe"
p = subprocess.Popen([exe], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

for i in range(10):
    time.sleep(1)
    ret = p.poll()
    if ret is not None:
        print(f"Exited with code {ret} at second {i+1}")
        out, err = p.communicate()
        print("STDOUT:", out)
        print("STDERR:", err)
        break
    else:
        print(f"Running at second {i+1}...")
else:
    print("App is running steadily! Terminating test.")
    p.kill()
