import time

class TokenCache:
    def __init__(self, ttl_seconds=60):
        self.cache = {}
        self.ttl = ttl_seconds

    def get(self, token):
        if token in self.cache:
            user_id, expiry = self.cache[token]
            if time.time() < expiry:
                return user_id
            else:
                del self.cache[token]
        return None

    def set(self, token, user_id):
        self.cache[token] = (user_id, time.time() + self.ttl)

c = TokenCache()
c.set("abc", "user1")
print(c.get("abc"))
