create table locations
(
    LocationID   bigint       not null
        primary key,
    Borough      varchar(100) not null,
    Zone         varchar(150) not null,
    service_zone varchar(100) null
);

create index idx_locations_borough
    on locations (Borough);

create index idx_locations_zone
    on locations (Zone);

create table payment_types
(
    payment_type bigint       not null
        primary key,
    payment_name varchar(100) not null,
    constraint payment_name
        unique (payment_name)
);

create index idx_payment_name
    on payment_types (payment_name);

create table rate_codes
(
    RatecodeID       bigint       not null
        primary key,
    rate_description varchar(100) not null,
    constraint rate_description
        unique (rate_description)
);

create table vendors
(
    VendorID    bigint       not null
        primary key,
    vendor_name varchar(150) not null,
    constraint vendor_name
        unique (vendor_name)
);

create table trips
(
    trip_id               bigint auto_increment
        primary key,
    VendorID              bigint                      not null,
    tpep_pickup_datetime  datetime                    not null,
    tpep_dropoff_datetime datetime                    not null,
    passenger_count       int                         not null,
    trip_distance         decimal(10, 2)              not null,
    RatecodeID            bigint                      null,
    store_and_fwd_flag    char                        null,
    PULocationID          bigint                      not null,
    DOLocationID          bigint                      not null,
    payment_type          bigint                      null,
    fare_amount           decimal(10, 2)              not null,
    extra                 decimal(10, 2) default 0.00 null,
    mta_tax               decimal(10, 2) default 0.00 null,
    tip_amount            decimal(10, 2) default 0.00 null,
    tolls_amount          decimal(10, 2) default 0.00 null,
    improvement_surcharge decimal(10, 2) default 0.00 null,
    total_amount          decimal(10, 2)              not null,
    congestion_surcharge  decimal(10, 2) default 0.00 null,
    constraint fk_trips_vendor
        foreign key (VendorID) references vendors (VendorID)
            on update cascade
);

create index idx_trips_dropoff_datetime
    on trips (tpep_dropoff_datetime);

create index idx_trips_dropoff_location
    on trips (DOLocationID);

create index idx_trips_payment_type
    on trips (payment_type);

create index idx_trips_pickup_datetime
    on trips (tpep_pickup_datetime);

create index idx_trips_pickup_location
    on trips (PULocationID);

create index idx_trips_ratecode
    on trips (RatecodeID);

create index idx_trips_total_amount
    on trips (total_amount);

create index idx_trips_vendor
    on trips (VendorID);
