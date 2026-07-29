-- http.request("http://localhost:4321")

-- while true do
--     local a, b, c, d, e, f = os.pullEvent()
--     print(a, b, c, d, e, f)
-- end

local res, err, h = http.get("http://localhost:4321/redirect", {}, true)
print(res.getResponseCode())
-- print(res.readAll())
print(res.read())

-- local res, err, h = http.get("http://localhost:4321/fail")

-- print(err)
-- print(h.readAll())
-- print(h.getResponseCode())
