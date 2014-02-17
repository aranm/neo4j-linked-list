var async = require('async');
var simpleneo4js = require('simpleneo4js');
var chai = require('chai');
var assert = chai.assert;


function runTestOnInsertionWith(numberOfNodes, numberOfRetries){
    beforeEach(function (done) {
        async.series([
            //delete every node in the database
            function (callback){
                simpleneo4js.query({
                    cypherQuery: 'MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE n,r',
                    parameters: {},
                    callback: callback
                });
            },
            //create the constraint on the head node of the linked list
            function (callback){
                simpleneo4js.query({
                    cypherQuery: 'CREATE CONSTRAINT ON (n:LINK) ASSERT n.list_head_id IS UNIQUE',
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

        var insertionQuery = "" +
            'MERGE (current_head:LINK {list_head_id: "unique_id"}) ' +
            'ON CREATE SET current_head.is_sentinel = true ' +
            'REMOVE current_head.list_head_id ' +
            'CREATE (new_head:LINK {list_head_id: "unique_id"})-[:NEXT]->current_head ';

        //we fire off the async map function, this will hit our server once
        //for every node in the array
        async.map(nodesToInsert, function(item, callback){
            simpleneo4js.query({
                cypherQuery: insertionQuery,
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
                    'MATCH (headNode:LINK)-[following:NEXT*]->lastFollowing ' +
                    'WHERE headNode.list_head_id = "unique_id" ' +
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

describe('Insert items into a linked list in parallel', function () {
    describe('Insert 50 items into a liked list in parallel', function (){
        runTestOnInsertionWith(50, 1);
    })
    describe('Insert 100 items into a liked list in parallel', function (){
        runTestOnInsertionWith(100, 2);
    })
    describe('Insert 200 items into a liked list in parallel', function (){
        runTestOnInsertionWith(200, 2);
    })
    describe('Insert 250 items into a liked list in parallel', function (){
        runTestOnInsertionWith(250, 2);
    })
});