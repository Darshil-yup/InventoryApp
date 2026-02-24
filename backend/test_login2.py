import urllib.request, json
print("Pinging Render...")
try:
    req = urllib.request.Request(
        "https://inventoryapp-hyoz.onrender.com/api/auth/login",
        data=json.dumps({"name": "Darshil", "pin": "3312"}).encode(),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req, timeout=30)
    print("Status:", res.status, "Body:", res.read().decode())
except Exception as e:
    if hasattr(e, 'read'):
        print("Error Body:", e.read().decode())
    else:
        print("Error:", e)
