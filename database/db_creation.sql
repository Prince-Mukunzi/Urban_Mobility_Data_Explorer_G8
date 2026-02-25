-- LOCATIONS
create table locations
(
    LocationID   bigint       not null primary key
        comment 'Unique identifier for a TLC taxi zone location',

    Borough      varchar(100) not null
        comment 'NYC borough where the taxi zone is located (e.g., Manhattan, Brooklyn)',

    Zone         varchar(150) not null
        comment 'Official TLC taxi zone name',

    service_zone varchar(100) null
        comment 'Service classification of the zone (e.g., Yellow Zone, Green Zone, Boro Zone)'
)
comment='Lookup table containing NYC Taxi & Limousine Commission location zones';


create index idx_locations_borough
    on locations (Borough);

create index idx_locations_zone
    on locations (Zone);



-- PAYMENT TYPES
create table payment_types
(
    payment_type bigint not null primary key
        comment 'Unique identifier for payment method',

    payment_name varchar(100) not null
        comment 'Human-readable payment method (e.g., Credit Card, Cash)',

    constraint uq_payment_name unique (payment_name)
)
comment='Lookup table defining valid trip payment methods';



-- RATE CODES
create table rate_codes
(
    RatecodeID bigint not null primary key
        comment 'Unique identifier for rate code applied to trip',

    rate_description varchar(100) not null
        comment 'Description of the applied rate (e.g., Standard Rate, JFK, Newark)',

    constraint uq_rate_description unique (rate_description)
)
comment='Lookup table defining official taxi rate categories';



-- VENDORS
create table vendors
(
    VendorID bigint not null primary key
        comment 'Unique identifier for taxi technology vendor',

    vendor_name varchar(150) not null
        comment 'Name of the taxi trip recording vendor/provider',

    constraint uq_vendor_name unique (vendor_name)
)
comment='Lookup table of authorized taxi data vendors';



-- TRIPS
create table trips
(
    trip_id bigint auto_increment primary key
        comment 'Unique trip record identifier',

    VendorID bigint not null
        comment 'Foreign key referencing taxi vendor that recorded the trip',

    tpep_pickup_datetime datetime not null
        comment 'Date and time when the meter was engaged (trip start)',

    tpep_dropoff_datetime datetime not null
        comment 'Date and time when the meter was disengaged (trip end)',

    passenger_count int not null
        comment 'Number of passengers in the vehicle',

    trip_distance decimal(10,2) not null
        comment 'Trip distance in miles as recorded by taximeter',

    RatecodeID bigint null
        comment 'Foreign key referencing rate code applied to the trip',

    store_and_fwd_flag char(1) null
        comment 'Indicates if trip record was held before sending to vendor (Y/N)',

    PULocationID bigint not null
        comment 'Foreign key referencing pickup taxi zone location',

    DOLocationID bigint not null
        comment 'Foreign key referencing drop-off taxi zone location',

    payment_type bigint null
        comment 'Foreign key referencing method of payment',

    fare_amount decimal(10,2) not null
        comment 'Base fare amount calculated by taximeter',

    extra decimal(10,2) default 0.00 null
        comment 'Extra charges such as rush hour or overnight surcharge',

    mta_tax decimal(10,2) default 0.00 null
        comment 'MTA tax automatically added to the fare',

    tip_amount decimal(10,2) default 0.00 null
        comment 'Tip amount paid by passenger',

    tolls_amount decimal(10,2) default 0.00 null
        comment 'Total toll charges during the trip',

    improvement_surcharge decimal(10,2) default 0.00 null
        comment 'TLC improvement surcharge added to trip',

    total_amount decimal(10,2) not null
        comment 'Total amount charged to passenger including all fees',

    congestion_surcharge decimal(10,2) default 0.00 null
        comment 'Congestion pricing surcharge applied in certain NYC zones',

    constraint fk_trips_vendor
        foreign key (VendorID)
        references vendors (VendorID),

    constraint fk_trips_ratecode
        foreign key (RatecodeID)
        references rate_codes (RatecodeID),

    constraint fk_trips_payment
        foreign key (payment_type)
        references payment_types (payment_type),

    constraint fk_trips_pu_location
        foreign key (PULocationID)
        references locations (LocationID)
        on update cascade,

    constraint fk_trips_do_location
        foreign key (DOLocationID)
        references locations (LocationID)
        on update cascade
)
comment='Table containing individual NYC taxi trip records';



-- TRIPS INDEXES
create index idx_trips_pickup_datetime
    on trips (tpep_pickup_datetime);

create index idx_trips_dropoff_datetime
    on trips (tpep_dropoff_datetime);

create index idx_trips_pickup_location
    on trips (PULocationID);

create index idx_trips_dropoff_location
    on trips (DOLocationID);

create index idx_trips_payment_type
    on trips (payment_type);

create index idx_trips_ratecode
    on trips (RatecodeID);

create index idx_trips_vendor
    on trips (VendorID);

create index idx_trips_total_amount
    on trips (total_amount);
