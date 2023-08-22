if fs.exists('printer') then
    fs.delete('printer')
end

if not pcall(function () shell.run('pastebin get mpuxagdY printer') end) then
    sleep(1)
    os.reboot()
end
shell.run('printer')