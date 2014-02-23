MATCH (user:USER)-[oldLink:LINKS]->(after)
REMOVE after.list_head_id
MERGE (user)-[:LINKS]->(current_head:LINK {list_head_id: "unique_id"})-[:LINKS]->after
DELETE oldLink