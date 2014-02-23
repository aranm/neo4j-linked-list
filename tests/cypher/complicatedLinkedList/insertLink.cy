MATCH (follower:USER), (leader:USER)
WHERE follower.identifier = {followerIdentifier} AND leader.identifier = {identifier}
WITH follower, leader
MATCH (follower)-[oldLink:LINKS]-(after)
REMOVE after.list_head_id
MERGE (follower)-[:LINKS]->(current_head:LINK {list_head_id: follower.identifier})-[:LINKS]->after
DELETE oldLink
WITH follower, leader, current_head
CREATE (current_head)-[:USERFOLLOWER]->leader
RETURN follower, leader