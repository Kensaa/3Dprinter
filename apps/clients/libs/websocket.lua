local module = { receivedMessages = {}, registerBody = nil, ws = nil }

local MAX_RETRIES = 5

function module.connect(connect_url, register_body, retry)
    retry = retry or 0
    local ws, err = http.websocket(connect_url)
    if not ws then
        print('Unable to connect to server, error : ')
        print(err)
        if retry > MAX_RETRIES then
            retry = MAX_RETRIES
        end
        print('Retrying in ' .. 3 ^ retry .. ' seconds')
        sleep(3 ^ retry)
        module.connect(connect_url, register_body, retry + 1)
    else
        print('Connected !')
        module.ws = ws
        module.sendRequestAndWaitForResponse("register", register_body)
        module.register_body = register_body
        module.connect_url = connect_url
    end
end

function module.send(body)
    if module.ws == nil then
        print('Not connected, unable to send message to server')
        return false
    end
    local success = pcall(function() module.ws.send(json.encode(body)) end)
    if not success then
        print('Unable to send message to server')
    end
    return success
end

function module.receiveLoop()
    while true do
        local _, _, response, isBinary = os.pullEvent("websocket_message")
        if not isBinary then
            local ok, decoded = pcall(json.decode, response)
            if ok then
                table.insert(module.receivedMessages, decoded)
                os.queueEvent("ws_message_available") -- just a wake-up nudge, no payload
            end
        end
    end
end

-- Function meant to be ran in the background sending pings to the server to test connection
function module.pingLoop()
    while true do
        if module.ws ~= nil then
            local response = module.sendRequestAndWaitForResponse('ping', {}, 5)
            if response == nil then
                print('server is not responding, waiting 10 seconds')
                module.ws = nil

                sleep(10)
                print('Reconnecting')
                if module.register_body == nil then
                    print('No register body, unable to reconnect')
                    return
                end
                module.connect(module.connect_url, module.register_body)
            end
        end
        sleep(5)
    end
end

-- Is t1 a "subtable" of t2?
function matchTable(t1, t2)
    if type(t1) ~= 'table' or type(t2) ~= 'table' then
        return false
    end
    for k, v in pairs(t1) do
        if type(v) == 'table' then
            if not matchTable(v, t2[k]) then
                return false
            end
        else
            if t2[k] ~= v then
                return false
            end
        end
    end
    return true
end

-- Is t1 a "subtable" of t2?
function matchTable(t1, t2)
    if type(t1) ~= 'table' or type(t2) ~= 'table' then
        return false
    end
    for k, v in pairs(t1) do
        if type(v) == 'table' then
            if not matchTable(v, t2[k]) then
                return false
            end
        else
            if t2[k] ~= v then
                return false
            end
        end
    end
    return true
end

function module.waitForMessage(pattern, timeout)
    local timer_id = nil
    if timeout and timeout > 0 then
        timer_id = os.startTimer(timeout)
    end

    while true do
        for i, msg in ipairs(module.receivedMessages) do
            if matchTable(pattern, msg) then
                table.remove(module.receivedMessages, i)
                return msg
            end
        end

        local event, a = os.pullEvent()
        if timer_id and event == "timer" and a == timer_id then
            return nil
        end
    end
end

function module.sendRequest(request, body)
    return module.send({ type = "request", body = { request = request, body = body or {} } })
end

function module.sendResponse(request, response, error)
    if error ~= nil then
        return module.send({ type = "response", body = { request = request, success = false, error = error } })
    else
        return module.send({ type = "response", body = { request = request, success = true, response = response or {} } })
    end
end

function module.sendRequestAndWaitForResponse(request, body, timeout)
    local sendSuccess = module.sendRequest(request, body)
    if not sendSuccess then
        return nil
    end
    local response = module.waitForMessage({ type = 'response', body = { request = request } }, timeout)
    if response == nil then
        return nil
    else
        if response.body.success then
            return response.body.response, response
        else
            print('Request ' .. response.body.request .. ' returned an error : ' .. response.body.error)
        end
    end
end

return module
