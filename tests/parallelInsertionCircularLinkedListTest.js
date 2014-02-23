var async = require('async');
var simpleneo4js = require('simpleneo4js');
var chai = require('chai');
var assert = chai.assert;
var fs  = require('fs');
var cleanDatabase = fs.readFileSync(require('path').resolve(__dirname, 'cypher', 'cleanDatabase.cy')).toString();
var createConstraint = fs.readFileSync(require('path').resolve(__dirname, 'cypher', 'createConstraint.cy')).toString();
var createUser = fs.readFileSync(require('path').resolve(__dirname, 'cypher', 'circularLinkedList', 'createUser.cy')).toString();
var insertLink = fs.readFileSync(require('path').resolve(__dirname, 'cypher', 'circularLinkedList', 'insertLink.cy')).toString();

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
            //create the constraint on the head node of the linked list
            function (callback){
                simpleneo4js.query({
                    cypherQuery: createUser,
                    parameters: {},
                    callback: callback
                });
            }
        ], done)
    });

    it('add a lot of items into the linked list in parallel', function(done){

        var nodesToInsert = [];

        for (var i = 0; i < numberOfNodes; i++){
            nodesToInsert.push(i);
        }

        //we fire off the async map function, this will hit our server once
        //for every node in the array
        async.map(nodesToInsert, function(item, callback){
            simpleneo4js.query({
                cypherQuery: insertLink,
                parameters: { nodeNumber: item },
                callback: callback,
                retryOn: "All",
                retryCount: numberOfRetries
            });
        }, function(err){
            if (err){
                done(err);
            }
            else{
                var getDetailsQuery = '' +
                    'MATCH (headNode:USER)-[following:LINKS*]->lastFollowing ' +
                    'WHERE headNode <> lastFollowing ' +
                    'RETURN COUNT(following) as following'

                simpleneo4js.query({
                    cypherQuery: getDetailsQuery,
                    parameters: {},
                    callback: function (error, results){
                        assert.equal(results.following, numberOfNodes, "Should be following " + numberOfNodes + " is following " + results.following);
                        if (error){
                            console.log(error);
                        }
                        done(error)
                    },
                    retryOn: "All",
                    retryCount: 1
                })
            }
        });
    })
};

describe('Insert items into a circular linked list in parallel', function () {
    describe('Insert 1 items into a circular liked list in parallel', function (){
        runTestOnInsertionWith(1, 1);
    })
    describe('Insert 50 items into a circular linked list in parallel', function (){
        runTestOnInsertionWith(50, 1);
    })
    describe('Insert 100 items into a circular linked list in parallel', function (){
        runTestOnInsertionWith(100, 2);
    })
    describe('Insert 200 items into a circular linked list in parallel', function (){
        runTestOnInsertionWith(200, 2);
    })
    describe('Insert 250 items into a circular linked list in parallel', function (){
        runTestOnInsertionWith(250, 2);
    })
});