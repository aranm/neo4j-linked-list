var async = require('async');
var simpleneo4js = require('simpleneo4js');
var chai = require('chai');
var assert = chai.assert;

describe('Create a more complex structure and run parallel insertion', function () {

    var numberOfNodes = 200;

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
            function (callback){
                var query = 'CREATE (newUser:USER {identifier: {identifier}}) ' +
                            'CREATE newUser-[:FOLLOWING]->newUser ' +
                            'RETURN newUser';

                var nodesToInsert = [];

                for (var i = 0; i < numberOfNodes; i++){
                    nodesToInsert.push({
                        identifier: i
                    });
                }

                async.map(nodesToInsert, function(item, insertCallback){
                    simpleneo4js.query({
                        cypherQuery: query,
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
                identifier: i
            });
        }


        /*
        * MATCH (follower:USER)
         WHERE follower.identifier = "0"
         MATCH follower-[oldFollowing:FOLLOWING]->after
         DELETE oldFollowing
         CREATE follower-[:FOLLOWING]->(followLink:followLink)-[:FOLLOWING]->after
         RETURN follower
        * */
        var insertionQuery = '' +
        'MATCH (follower:USER), (leader:USER) ' +
        'WHERE follower.identifier = 0 AND leader.identifier = {identifier} ' +
        'WITH follower, leader ' +
        'MATCH follower-[oldFollowing:FOLLOWING]->after ' +
        'REMOVE follower._lock_ ' +
        'REMOVE after._lock_ ' +
        'DELETE oldFollowing ' +
        'CREATE follower-[:FOLLOWING]->(followLink:FOLLOWLINK)-[:FOLLOWING]->after ' +
        //'CREATE followLink-[:USERFOLLOWER]->leader ' +
        'RETURN follower, followLink, leader '

        //we fire off the async map function, this will hit our server once
        //for every node in the array
        async.map(nodesToInsert, function(item, callback){
            if (item.identifier == 0){
                callback();
            }
            else {
                simpleneo4js.query({
                    cypherQuery: insertionQuery,
                    parameters: item,
                    callback: callback,
                    retryOn: "All",
                    retryCount: 1
                })
            }
        }, function(err, results){
            if (err){
                done(err);
            }
            else{
                var getDetailsQuery = '' +
                    'MATCH (follower:USER) ' +
                    'WHERE follower.identifier = 0 ' +
                    'MATCH follower-[following:FOLLOWING*]->lastFollowing ' +
                    'WHERE lastFollowing <> follower ' +
                    'RETURN COUNT(following) as following'

                simpleneo4js.query({
                    cypherQuery: getDetailsQuery,
                    parameters: {},
                    callback: function (error, results){
                        assert.equal(results.following, numberOfNodes - 1, "Should be following " + numberOfNodes - 1 + " is following " + results.following);
                        done(error)
                    },
                    retryOn: "All",
                    retryCount: 1
                })
            }
        });
    })
});