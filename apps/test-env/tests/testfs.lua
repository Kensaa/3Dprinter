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

print("\n== seek ==")
do
    local h = fs.open("seektest.txt", "w")
    h.write("0123456789")
    h.close()

    local r = fs.open("seektest.txt", "r")

    -- default whence is "cur"; starting position should be 0
    local pos = r.seek()
    check("seek() with no args returns current position (0)", pos == 0)

    -- "set": absolute position from start
    pos = r.seek("set", 5)
    check("seek('set', 5) moves to absolute position 5", pos == 5)
    check("read() after seek('set', 5) returns '5'", r.read(1) == "5")

    -- "cur": relative to current position (now at 6, after the read above)
    pos = r.seek("cur", 2)
    check("seek('cur', 2) moves forward by 2 (to 8)", pos == 8)
    check("read() after seek('cur', 2) returns '8'", r.read(1) == "8")

    -- "end": relative to end of file (10 bytes total)
    pos = r.seek("end", 0)
    check("seek('end', 0) moves to end of file (10)", pos == 10)
    check("readAll() at end of file returns nil (nothing left)", r.readAll() == nil)

    pos = r.seek("end", -3)
    check("seek('end', -3) moves 3 back from end (to 7)", pos == 7)
    check("readAll() after seek('end', -3) returns last 3 bytes", r.readAll() == "789")

    -- back to the beginning explicitly
    pos = r.seek("set", 0)
    check("seek('set', 0) returns to start", pos == 0)
    check("readLine() from the start returns the whole line (no newlines in this file)", r.readLine() == "0123456789")

    r.close()
end

print("\n== seek error cases ==")
do
    local r = fs.open("seektest.txt", "r")

    local pos, err = r.seek("set", -1)
    check("seeking before the start fails", pos == nil)
    check("...with an out-of-bounds message", err ~= nil and err:find("out of bounds") ~= nil)

    pos, err = r.seek("set", 999)
    check("seeking past the end fails", pos == nil)
    check("...with an out-of-bounds message too", err ~= nil and err:find("out of bounds") ~= nil)

    pos, err = r.seek("bogus", 0)
    check("an invalid whence value fails", pos == nil)
    check("...with an invalid-option message", err ~= nil and err:find("invalid option") ~= nil)

    r.close()
end

print("\n" .. failures .. " failure(s)")
if failures > 0 then
    error("filesystem test suite failed", 0)
end
