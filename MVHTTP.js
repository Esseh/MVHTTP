/*:
 * @plugindesc Allows easy communication with web servers from RPG Maker context.
 * @author Kenneth "Esseh" Willeford
 *
 * @param hostname
 * @desc Address of default host to connect to.
 * @default 127.0.0.1
 *
 * @param timeout
 * @desc How long for a request to 'timeout' and return an error.
 * @default 3000
 *
 * @help 
 * * Plugin Commands:
 *  ChangeHost <NewHostName>	# Changes the currently set host.
 *
 * The plugin allows the following script calls... 
 * MVHTTP.get(endpointHandler,JavascriptObjectArguments)
 *   performs a GET request at the endpoint passing the javascript object as form values to the server.
 *   This function performs syncrhonously and so will return a javascript object of the following form...
 *	{
 *		result: null | string,
 *		error: null | string
 *	}
 *   On success result becomes non-null and error remains null.
 *   On failure result becomes null and error becomes the integer error code.
 *
 * MVHTTP.post(endpointHandler,JavascriptObjectArguments)
 *   Same as the syncrhonous GET but instead the arguments are passed as a singular JSON-Encoded string
 *   It's up to the server to marshal the string into a local datatype.
 *
 * MVHTTP.aget(endpointHandler,JavascriptObjectArguments,successCallback,failureCallback)
 *   asyncrhonously performs a GET request at the endpoint passing the javascript object as form values to the server.
 *   because it is asyncrhonous no value is returned, instead two callback functions can be registered to perform on success or failure respectively.
 *   the success callback in particular expects the string that would have been put into the result portion of the syncrhonous object.
 *
 * MVHTTP.apost(endpointHandler,JavascriptObjectArguments,successCallback,failureCallback)
 *   asynchronous equivalent to MVHTTP.post
 *
 * All functions can be tested utilizing https://httpbin.org/
 * Here are some examples you can try from script calls. First set hostname to https://httpbin.org/
 * Create an actor, when the actor is spoken to use one of the following script calls...
 * alert(MVHTTP.get("get",{dataToSend:"theActualData"}).result);
 * alert(MVHTTP.post("post",{dataToSend:"theActualData"}).result);
 * 
 * MVHTTP.aget("get",{dataToSend:"theActualData"},
 *  function(responseData){ alert(responseData); },
 *  function(){ alert("something went wrong"); }
 * );
 *
 * MVHTTP.apost("post",{dataToSend:"theActualData"},
 *  function(responseData){ alert(responseData); },
 *  function(){ alert("something went wrong"); }
 * );
 */
MVHTTP = {};
(function() {
    // Get Parameters and Default Fallback Values
    var parameters = PluginManager.parameters("MVHTTP");
    var hostname = parameters.hostname || "127.0.0.1";
    var timeout = parseInt(parameters.timeout, 10) || 3000;

    // Setup Plugin Commands
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === "ChangeHost") {
            hostname = args[0];
        }
    };

    // Helper Function, Constructs a basic XMLHttpRequest
    function ajaxBase(method, handler, isAsync, args) {
        var xhttp = new XMLHttpRequest();
        var dst = hostname + handler;
        if (method == "GET" && args) {
            dst += "?";
        }
        xhttp.open(method, dst, isAsync);
        return xhttp;
    }

    // Formats the arguments for GET requests
    function makeGETArgs(args) {
        if (args === undefined) {
            return "";
        }
        return "?" + Object.keys(args).map(function(key) {
            return key + '=' + args[key];
        }).join('&');
    }

    // Formats the arguments for POST requests
    function makePOSTArgs(args) {
        if (args === undefined) {
            args = {};
        }
        return JSON.stringify(args);
    }

    // Adds asyncrhonous callbacks to asynchronous requests.
    function xhttpCallbackDecorator(xhttp, successCallback, failureCallback) {
        xhttp.timeout = timeout;
        if (successCallback === undefined) {
            successCallback = function(responseText) {};
        }
        if (failureCallback === undefined) {
            failureCallback = function() {};
        }
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                successCallback(xhttp.responseText);
            }
            if (xhttp.status >= 400) {
                failureCallback();
            }
        };
    }

    // Constructs the output for sycnrhonous requests.
    function xhttpGetSynchronousResult(xhttp) {
        output = {
            result: null,
            error: null
        };
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            output.result = xhttp.responseText;
        } else {
            output.error = xhttp.status;
        }
        return output;
    }

    // Syncrhonous GET Request
    MVHTTP.get = function(handler, args) {
        handler += makeGETArgs(args);
        var xhttp = ajaxBase("GET", handler, false);
        xhttp.send(null);
        return xhttpGetSynchronousResult(xhttp);
    };

    // Syncrhonous POST Request
    MVHTTP.post = function(handler, args) {
        var xhttp = ajaxBase("POST", handler, false);
        xhttp.send(makePOSTArgs(args));
        return xhttpGetSynchronousResult(xhttp);
    };

    // Asyncrhonous GET Request
    MVHTTP.aget = function(handler, args, successCallback, failureCallback) {
        handler += makeGETArgs(args);
        var xhttp = ajaxBase("GET", handler, true);
        xhttpCallbackDecorator(xhttp, successCallback, failureCallback);
        xhttp.send(null);
    };

    // Asyncrhonous POST Request
    MVHTTP.apost = function(handler, args, successCallback, failureCallback) {
        var xhttp = ajaxBase("POST", handler, true);
        xhttpCallbackDecorator(xhttp, successCallback, failureCallback);
        xhttp.send(makePOSTArgs(args));
    };

    // Run tests to make sure implementaiton is correct, if neccessary plugin users can run it to make sure it runs correctly on their system.
    // If nothing pops up then that means nothing is wrong.
    MVHTTP.runTests = function() {
        var configValue = hostname;
        hostname = "https://httpbin.org/";

        function assertEqual(id, actual, expected) {
            if (expected != actual) {
                alert("test " + id.toString() + " has failed");
            }
        }

        function assertNotEqual(id, actual, expected) {
            if (expected == actual) {
                alert("test " + id.toString() + " has failed");
            }
        }

        function failCallback() {
            alert("asyncrhonous test has failed");
        }
        // Good Null GET
        assertEqual(1, MVHTTP.get("get").error, null);
        assertNotEqual(1, MVHTTP.get("get").result, null);
        // Good Empty GET
        assertEqual(2, MVHTTP.get("get", {}).error, null);
        assertNotEqual(2, MVHTTP.get("get", {}).result, null);
        // Good Arbitrary GET
        assertEqual(3, MVHTTP.get("get", {
            key: "value"
        }).error, null);
        assertNotEqual(3, MVHTTP.get("get", {
            key: "value"
        }).result, null);
        // Bad GET
        assertEqual(4, MVHTTP.get("post", {
            key: "value"
        }).result, null);
        assertNotEqual(4, MVHTTP.get("post", {
            key: "value"
        }).error, null);
        // Good Null POST
        assertEqual(5, MVHTTP.post("post").error, null);
        assertNotEqual(5, MVHTTP.post("post").result, null);
        // Good Empty POST
        assertEqual(6, MVHTTP.post("post", {}).error, null);
        assertNotEqual(6, MVHTTP.post("post", {}).result, null);
        // Good Arbitrary POST
        assertEqual(7, MVHTTP.post("post", {
            key: "value"
        }).error, null);
        assertNotEqual(7, MVHTTP.post("post", {
            key: "value"
        }).result, null);
        // Bad POST
        assertEqual(8, MVHTTP.post("get", {
            key: "value"
        }).result, null);
        assertNotEqual(8, MVHTTP.post("get", {
            key: "value"
        }).error, null);
        // Good Async Null GET
        MVHTTP.aget("get", undefined, undefined, failCallback);
        // Good Async Empty GET
        MVHTTP.aget("get", {}, undefined, failCallback);
        // Good Async Arbitrary GET
        MVHTTP.aget("get", {
            key: "value"
        }, undefined, failCallback);
        // Bad Async GET
        MVHTTP.aget("post", {
            key: "value"
        }, failCallback);
        // Good Async Null POST
        MVHTTP.apost("post", undefined, undefined, failCallback);
        // Good Async Empty POST
        MVHTTP.apost("post", {}, undefined, failCallback);
        // Good Async Arbitrary POST
        MVHTTP.apost("post", {
            key: "value"
        }, undefined, failCallback);
        // Bad Async POST
        MVHTTP.apost("get", {
            key: "value"
        }, failCallback);
        hostname = configValue;
    };
})();
MVHTTP.runTests();