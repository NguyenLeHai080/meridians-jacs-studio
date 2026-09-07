import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

try:
    req = urllib.request.Request(
        'http://221.121.1.3:84/api/v1/auth/login', 
        data=json.dumps({'email':'admin@jacs-studio.vn','password':'admin'}).encode(), 
        headers={'Content-Type':'application/json'}
    )
    res = urllib.request.urlopen(req, context=ctx, timeout=10)
    tok = json.loads(res.read().decode())['data']['access_token']

    req2 = urllib.request.Request(
        'http://221.121.1.3:84/api/v1/telemetry/global-requests?limit=5', 
        headers={'Authorization': f'Bearer {tok}'}
    )
    res2 = urllib.request.urlopen(req2, context=ctx, timeout=10)
    data = json.loads(res2.read().decode())
    print('SUCCESS! Summary:', json.dumps(data['data']['summary'], ensure_ascii=False))
    print('First log:', json.dumps(data['data']['logs'][0], ensure_ascii=False))
except Exception as e:
    print('Error:', e)
