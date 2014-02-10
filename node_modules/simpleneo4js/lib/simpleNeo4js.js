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

    function queryWithCallback(cypherQuery, parameters, callback, retries){
        if (retries == undefined){
            retries = 0;
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
                                //Neo4j does not return a specific error code for a deadlock
                                return (error.code == "Neo.DatabaseError.Statement.ExecutionFailure") && (error.message.indexOf("deadlock") != -1);
                            }) != null){
                                //we have a deadlock error and we need to re-run the transaction
                                if (retries < retryCount){
                                    queryWithCallback(cypherQuery, parameters, callback, retries++);
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


    function queryWithEvent(cypherQuery, parameters){
        var eventEmitter = new events.EventEmitter();

        queryWithCallback(cypherQuery, parameters, function (error, data){
            if (error){
                eventEmitter.emit('error', error);
            }
            else{
                eventEmitter.emit('data', data);
            }
        })

        return eventEmitter;
    }

    function query(cypherQuery, parameters, callback){
        if (callback != undefined){
            return queryWithCallback(cypherQuery, parameters, callback);
        }
        else{
            return queryWithEvent(cypherQuery, parameters);
        }
    }

    return {
        url: urlProperty,
        retryCount: retryCountProperty,
        query: query
    };
})();

module.exports = simpleNeo4js;