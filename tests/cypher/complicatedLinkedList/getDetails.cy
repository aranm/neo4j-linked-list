MATCH (follower:USER)
WHERE follower.identifier = 0
MATCH follower-[following:LINKS*]->lastFollowing
WHERE lastFollowing <> follower
RETURN COUNT(following) as following