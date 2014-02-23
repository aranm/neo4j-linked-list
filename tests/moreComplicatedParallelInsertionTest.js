var async = require('async');
var simpleneo4js = require('simpleneo4js');
var chai = require('chai');
var assert = chai.assert;
var fs  = require('fs');
var cleanDatabase = fs.readFileSync(require('path').resolve(__dirname, 'cypher', 'cleanDatabase.cy')).toString();
var createConstraint = fs.readFileSync(require('path').resolve(__dirname, 'cypher', 'createConstraint.cy')).toString();
var createUser = fs.readFileSync(require('path').resolve(__dirname, 'cypher', 'complicatedLinkedList', 'createUser.cy')).toString();
var insertLink = fs.readFileSync(require('path').resolve(__dirname, 'cypher', 'complicatedLinkedList', 'insertLink.cy')).toString();
var getDetails = fs.readFileSync(require('path').resolve(__dirname, 'cypher', 'complicatedLinkedList', 'getDetails.cy')).toString();

function runTestOnInsertionWith(numberOfNodes, numberOfRetries){
    beforeEach(function (done) {
        async.series([
            //delete every node in the database
            function (callback){
                simpleneo4js.query({
                    cypherQuery: cleanDatabase,
                    parameters: {},
                    callback: callback
                });
            },
            //create the constraint on the head node of the linked list
            function (callback){
                simpleneo4js.query({
                    cypherQuery: createConstraint,
                    parameters: {},
                    callback: callback
                });
            },
            function (callback){
                var nodesToInsert = [];

                for (var i = 0; i < numberOfNodes; i++){
                    nodesToInsert.push({
                        identifier: i
                    });
                }

                async.map(nodesToInsert, function(item, insertCallback){
                    simpleneo4js.query({
                        cypherQuery: createUser,
                        parameters: item,
                        callback: insertCallback
                    });
                }, callback);
            }
        ], done)
    });

    it('add a lot of items into the linked list in parallel', function(done){

        var nodesToInsert = [];

        for (var i = 0; i < numberOfNodes; i++){
            nodesToInsert.push({
                identifier: i,
                followerIdentifier: 0

            });
        }

        //we fire off the async map function, this will hit our server once
        //for every node in the array
        async.map(nodesToInsert, function(item, callback){
            if (item.identifier == 0){
                callback();
            }
            else {

                var localCallback = function (error, results){
                    callback(error, results);
                }
                simpleneo4js.query({
                    cypherQuery: insertLink,
                    parameters: item,
                    callback: localCallback,
                    retryOn: "All",
                    retryCount: numberOfRetries
                })
            }
        }, function(err, results){
            if (err){
                done(err);
            }
            else{
                simpleneo4js.query({
                    cypherQuery: getDetails,
                    parameters: {},
                    callback: function (error, results){
                        assert.equal(results["following"], numberOfNodes - 1, "Should be following " + numberOfNodes - 1 + " is following " + results["following"]);
                        done(error)
                    },
                    retryOn: "None",
                    retryCount: 0
                })
            }
        });
    })
}

describe('Insert items into a circular complicated linked list in parallel', function () {
    describe('Insert 1 items into a circular complicated liked list in parallel', function (){
        runTestOnInsertionWith(1, 1);
    })
    describe('Insert 50 items into a circular complicated linked list in parallel', function (){
        runTestOnInsertionWith(50, 1);
    })
    describe('Insert 100 items into a circular complicated linked list in parallel', function (){
        runTestOnInsertionWith(100, 2);
    })
    describe('Insert 200 items into a circular complicated linked list in parallel', function (){
        runTestOnInsertionWith(200, 2);
    })
    describe('Insert 250 items into a circular complicated linked list in parallel', function (){
        runTestOnInsertionWith(250, 2);
    })
});