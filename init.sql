-- TODO: Do we need to add a line about connecting to a schema?

-- TODO: I think Docker already creates created_at and updated_at, but maybe add them manually
  -- for deployment reasons?

-- TBD: Might want to make indexes based on performance

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS Review CASCADE;
DROP TABLE IF EXISTS Favorite CASCADE;
DROP TABLE IF EXISTS Location CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

CREATE TABLE "User" (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    home_location VARCHAR(255),
    admin BOOLEAN DEFAULT false NOT NULL,
    tutorial BOOLEAN DEFAULT true NOT NULL, --for first time users
    settings JSONB, -- JSON binary mode, eg: settings -> 'field'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TODO: Might need more columns for shade, noise(db) etc. Not sure how this interacts with the API 
CREATE TABLE Location (
    location_id SERIAL PRIMARY KEY,
    location_name VARCHAR(255) NOT NULL,
    coordinates POINT NOT NULL, -- point is an x,y coordinate
    overall_rating_avg DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Favorite (
    favorite_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_favorite_user FOREIGN KEY (customer_id) 
        REFERENCES "User"(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_favorite_location FOREIGN KEY (location_id) 
        REFERENCES Location(location_id) ON DELETE CASCADE,
    CONSTRAINT unique_user_location UNIQUE (customer_id, location_id) -- prevents duplicates on favorites list
);

CREATE TABLE Review (
    review_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    shade_rating INTEGER CHECK (shade_rating >= 1 AND shade_rating <= 5),
    accessibility_rating INTEGER CHECK (accessibility_rating >= 1 AND accessibility_rating <= 5),
    noise_rating INTEGER CHECK (noise_rating >= 1 AND noise_rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Same as created_at on creation, then updated by updated_time()
    CONSTRAINT fk_review_user FOREIGN KEY (user_id) 
        REFERENCES "User"(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_review_location FOREIGN KEY (location_id) 
        REFERENCES Location(location_id) ON DELETE CASCADE
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_time();

CREATE TRIGGER update_location_updated_at BEFORE UPDATE ON Location
    FOR EACH ROW EXECUTE FUNCTION update_time();

CREATE TRIGGER update_review_updated_at BEFORE UPDATE ON Review
    FOR EACH ROW EXECUTE FUNCTION update_time();


/*
 * Create a function and triggers to update overall_rating_avg of a location
 * claude.ai
 *
 * @author Sonnet 4.5
*/
-- Create function to update location's overall_rating_avg
CREATE OR REPLACE FUNCTION update_location_rating_avg()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE Location
    SET overall_rating_avg = (
        SELECT COALESCE(AVG(overall_rating), 0)
        FROM Review
        WHERE location_id = COALESCE(NEW.location_id, OLD.location_id)
    )
    WHERE location_id = COALESCE(NEW.location_id, OLD.location_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;


-- Create triggers to automatically update location rating average
CREATE TRIGGER update_rating_on_insert AFTER INSERT ON Review
    FOR EACH ROW EXECUTE FUNCTION update_location_rating_avg();
 
CREATE TRIGGER update_rating_on_update AFTER UPDATE ON Review
    FOR EACH ROW EXECUTE FUNCTION update_location_rating_avg();
 
CREATE TRIGGER update_rating_on_delete AFTER DELETE ON Review
    FOR EACH ROW EXECUTE FUNCTION update_location_rating_avg();