local url = "http://localhost:9513"

if fs.exists('printer') then
    fs.delete('printer')
end

if not pcall(function () shell.run('wget '..url..'/clients/printer.lua printer') end) then
    sleep(1)
    os.reboot()
end
shell.run('printer')