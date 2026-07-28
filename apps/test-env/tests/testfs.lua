local failures = 0
local function check(label, condition)
    if condition then
        print("  OK   " .. label)
    else
        failures = failures + 1
        print("  FAIL " .. label)
    end
end

print("== write + read back ==")
do
    local h = fs.open("greeting.txt", "w")
    check("open for write returns a handle", h ~= nil)
    h.write("Hello, ")
    h.write("turtle!")
    h.close()

    local r = fs.open("greeting.txt", "r")
    check("reopen for read returns a handle", r ~= nil)
    local content = r.readAll()
    check("readAll matches what was written", content == "Hello, turtle!")
    r.close()
end

print("\n== writeLine + readLine ==")
do
    local h = fs.open("log.txt", "w")
    h.writeLine("line one")
    h.writeLine("line two")
    h.writeLine("line three")
    h.close()

    local r = fs.open("log.txt", "r")
    check("first line", r.readLine() == "line one")
    check("second line", r.readLine() == "line two")
    check("third line", r.readLine() == "line three")
    check("readLine past end returns nil", r.readLine() == nil)
    r.close()
end

print("\n== nested path creates parent directories ==")
do
    local h = fs.open("data/nested/deep.txt", "w")
    check("open with nested path succeeds", h ~= nil)
    h.write("buried treasure")
    h.close()

    local r = fs.open("data/nested/deep.txt", "r")
    check("content survives at nested path", r ~= nil and r.readAll() == "buried treasure")
    if r then r.close() end
end

print("\n== append mode ==")
do
    local h = fs.open("append.txt", "w")
    h.write("first-")
    h.close()

    local h2 = fs.open("append.txt", "a")
    h2.write("second")
    h2.close()

    local r = fs.open("append.txt", "r")
    check("append preserves earlier content", r.readAll() == "first-second")
    r.close()
end

print("\n== flush without close is visible to a fresh read ==")
do
    local h = fs.open("flushed.txt", "w")
    h.write("partial")
    h.flush()
    -- deliberately NOT closed yet -- flush alone should have persisted it
    local r = fs.open("flushed.txt", "r")
    check("flush persists without close", r ~= nil and r.readAll() == "partial")
    if r then r.close() end
    h.close()
end

print("\n== error cases ==")
do
    local missing, err = fs.open("does/not/exist.txt", "r")
    check("reading a missing file returns nil", missing == nil)
    check("...with a 'No such file' message", err ~= nil and err:find("No such file") ~= nil)

    -- opening the directory created above as if it were a file
    local as_dir, dir_err = fs.open("data", "r")
    check("opening a directory for read returns nil", as_dir == nil)
    check("...with an 'Is a directory' message", dir_err ~= nil and dir_err:find("Is a directory") ~= nil)

    local write_over_dir, write_err = fs.open("data", "w")
    check("opening a directory for write also returns nil", write_over_dir == nil)
    check("...with an 'Is a directory' message too", write_err ~= nil and write_err:find("Is a directory") ~= nil)
end

print("\n" .. failures .. " failure(s)")
if failures > 0 then
    error("filesystem test suite failed", 0)
end
