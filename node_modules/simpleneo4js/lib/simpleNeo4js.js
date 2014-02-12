/**
 * Created by Aran Mulholland on 19/01/2014.
 */
var events = require('events');
var request = require('superagent');
var arraySupport = require('./arraySupport')

var simpleNeo4js = (function (){
    var url = 'http://localhost:7474';
    var retryCount = 0;

    function urlProperty(){
        if (arguments.length > 0){
            url = arguments[0];
            return url;
        }
        return url;
    }

    function retryCountProperty(){
        if (arguments.length > 0){
            retryCount = arguments[0];
            return retryCount;
        }
        return retryCount;
    }

    function flatten(resultData){
        if (resultData.length == 0){
            return null;
        }

        if (resultData.length == 1){
            return flatten(resultData[0]);
        }

        return resultData;
    }

    function packageData(resultData){
        if (resultData == null){
            return null;
        }
        else if (resultData.results == null){
            return null;
        }
        else if (resultData.results.length == 0){
            return null;
        }
        else {
            var returnValue = [];

            resultData.results.forEach(function (result){
                var returnResult = [];
                result.data.forEach(function (dataItem){
                    var returnData = {}
                    result.columns.forEach(function (column, index){
                        returnData[column] = dataItem.row[index];
                    });
                    returnResult.push(returnData);
                });

                returnValue.push(returnResult);
            });

            returnValue = flatten(returnValue);

            return returnValue;
        }
    }

    function shouldRetryQueryOnError(error, requestParameters){
        if (requestParameters.retryOn == "All"){
            return true;
        }

        if (error.code == requestParameters.retryOn){
            return true;
        }

        return false;
    }

    function queryWithCallback(requestParameters, retries){
        var cypherQuery = requestParameters.cypherQuery;
        var parameters = requestParameters.parameters;
        var callback = requestParameters.callback;

        if (retries == undefined){
            retries = 0;
        }

        if (requestParameters.retryCount == undefined){
            //set the retry count to be the default defined by the client
            //if it has not been set
            requestParameters.retryCount = retryCount;
        }

        request
            .post(url + '/db/data/transaction/commit')
            .set('Content-Type', 'application/json')
            .set('X-Stream', 'true')
            .send({
                statements:[{
                    statement: cypherQuery,
                    parameters: parameters
                }]
            })
            .end(function(result) {
                switch(result.statusCode) {
                    case 200:

                        //we have errors
                        if (result.body.errors.length > 0){
                            if (arraySupport.firstOrNull(result.body.errors, function (error){
                                return shouldRetryQueryOnError(error, requestParameters);
                            }) != null){
                                if (retries < requestParameters.retryCount){
                                    queryWithCallback(requestParameters, retries++);
                                    return;
                                }
                            }
                            var allErrors = result.body.errors.map(function (error){
                                return error.message;
                            });
                            callback(allErrors);
                        }
                        else{
                            callback(null, packageData(result.body))
                        }
                        break;
                    default:
                        callback(result.statusCode)
                }
            });
    }


    function queryWithEvent(requestParameters){
        var eventEmitter = new events.EventEmitter();

        requestParameters.callback = function (error, data){
            if (error){
                eventEmitter.emit('error', error);
            }
            else{
                eventEmitter.emit('data', data);
            }
        };

        queryWithCallback(requestParameters)

        return eventEmitter;
    }


    function query(requestParameters){
        if (requestParameters.callback != undefined){
            return queryWithCallback(requestParameters);
        }
        else{
            return queryWithEvent(requestParameters);
        }
    }

    return {
        url: urlProperty,
        retryCount: retryCountProperty,
        query: query
    };
})();

module.exports = simpleNeo4js;