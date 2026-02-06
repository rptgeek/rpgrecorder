-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "search_vector" tsvector;

-- CreateIndex
CREATE INDEX "session_search_vector_idx" ON "Session" USING GIN ("search_vector");

-- CreateTriggerFunction
CREATE OR REPLACE FUNCTION session_search_vector_trigger() RETURNS trigger AS $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new."transcriptText", '')), 'C');
  return new;
end
$$ LANGUAGE plpgsql;

-- CreateTrigger
CREATE TRIGGER session_search_vector_update BEFORE INSERT OR UPDATE
  ON "Session" FOR EACH ROW EXECUTE FUNCTION session_search_vector_trigger();

-- Initialize existing records
UPDATE "Session" SET "search_vector" = 
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce("transcriptText", '')), 'C');
