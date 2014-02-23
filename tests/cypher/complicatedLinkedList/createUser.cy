CREATE (newUser:USER {identifier: {identifier}})-[oldLink:LINKS]->(newUser)
RETURN newUser