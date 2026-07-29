-- http.request("http://localhost:4321")

-- while true do
--     local a, b, c, d, e, f = os.pullEvent()
--     print(a, b, c, d, e, f)
-- end

local a, b, c, d, e = http.get("http://localhost:4321")
print(a, b, c, d, e)
