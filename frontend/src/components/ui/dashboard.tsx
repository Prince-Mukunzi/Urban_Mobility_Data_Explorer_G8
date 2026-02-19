import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Calendar } from "./calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Field, FieldGroup, FieldLabel, FieldSet } from "./field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { type DateRange } from "react-day-picker";
import { Separator } from "./separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Slider } from "./slider";
import { Button } from "./button";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { format } from "date-fns";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";

interface Trip {
  no: string;
  pickup_time: string;
  dropoff_time: string;
  pickup_borough: string;
  dropoff_borough: string;
  distance: number;
  passengers: number;
  fare: number;
  tip: number;
  total: number;
}

interface Stats {
  total_trips: number;
  avg_fare: number;
  avg_distance: number;
  avg_tip_pct: number;
  best_borough: string;
  peak_hour: string;
}

const BOROUGHS = [
  "Bronx",
  "Brooklyn",
  "EWR",
  "Manhattan",
  "N/A",
  "Queens",
  "Staten Island",
  "Unknown",
];

const BOROUGH_COLORS: Record<string, string> = {
  Manhattan: "#f59e0b",
  Brooklyn: "#3b82f6",
  Queens: "#10b981",
  Bronx: "#ef4444",
  "Staten Island": "#8b5cf6",
  EWR: "#ec4899",
  "N/A": "#6b7280",
  Unknown: "#9ca3af",
};

function boroughStyle(feature?: GeoJSON.Feature): PathOptions {
  const borough = feature?.properties?.borough || "Unknown";
  return {
    fillColor: BOROUGH_COLORS[borough] || "#9ca3af",
    weight: 1,
    opacity: 0.7,
    color: "#fff",
    fillOpacity: 0.45,
  };
}

function onEachZone(feature: GeoJSON.Feature, layer: Layer) {
  const props = feature.properties;
  if (!props) return;
  layer.bindTooltip(`${props.zone} (${props.borough})`, {
    sticky: true,
    className: "zone-tooltip",
  });
  layer.on({
    mouseover: (e) => {
      const target = e.target;
      target.setStyle({ fillOpacity: 0.75, weight: 2 });
    },
    mouseout: (e) => {
      const target = e.target;
      target.setStyle({ fillOpacity: 0.45, weight: 1 });
    },
  });
}

const API = "http://127.0.0.1:3000/api";

export function Dashboard() {
  const [pub, setPub] = useState("Any");
  const [dob, setDob] = useState("Any");
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2019, 0, 1),
    to: new Date(2019, 0, 1),
  });
  const [passengerCount, setPassengerCount] = useState([1, 6]);
  const [tdistance, setTdistance] = useState([0, 50]);
  const [fare, setFare] = useState([0, 200]);
  const [time, setTime] = useState("");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total_trips: 0,
    avg_fare: 0,
    avg_distance: 0,
    avg_tip_pct: 0,
    best_borough: "N/A",
    peak_hour: "N/A",
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [geoData, setGeoData] = useState<any>(null);
  const geoJsonKey = useRef(0);

  useEffect(() => {
    fetch(`${API}/zones`)
      .then((r) => r.json())
      .then((data) => {
        setGeoData(data);
        geoJsonKey.current += 1;
      })
      .catch(console.error);
  }, []);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (pub && pub !== "Any") params.append("pickup_borough", pub);
    if (dob && dob !== "Any") params.append("dropoff_borough", dob);
    if (date?.from) params.append("date_from", format(date.from, "yyyy-MM-dd"));
    if (date?.to) params.append("date_to", format(date.to, "yyyy-MM-dd"));
    params.append("min_passengers", passengerCount[0].toString());
    params.append("max_passengers", passengerCount[1].toString());
    params.append("min_distance", tdistance[0].toString());
    params.append("max_distance", tdistance[1].toString());
    params.append("min_fare", fare[0].toString());
    params.append("max_fare", fare[1].toString());
    if (time) {
      const hour = parseInt(time.split(":")[0], 10);
      if (!isNaN(hour)) params.append("pickup_hour", hour.toString());
    }
    return params.toString();
  }, [pub, dob, date, passengerCount, tdistance, fare, time]);

  const fetchData = useCallback(
    async (qs?: string) => {
      const query = qs ?? buildParams();

      setLoading(true);
      fetch(`${API}/trips?${query}`)
        .then((res) => res.json())
        .then((data) => setTrips(data.trips))
        .catch(console.error)
        .finally(() => setLoading(false));

      setStatsLoading(true);
      fetch(`${API}/stats?${query}`)
        .then((res) => res.json())
        .then((data) => setStats(data))
        .catch(console.error)
        .finally(() => setStatsLoading(false));
    },
    [buildParams]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleReset = () => {
    setPub("Any");
    setDob("Any");
    setDate({ from: new Date(2019, 0, 1), to: new Date(2019, 0, 1) });
    setPassengerCount([1, 6]);
    setTdistance([0, 50]);
    setFare([0, 200]);
    setTime("");

    const defaults = new URLSearchParams({
      date_from: "2019-01-01",
      date_to: "2019-01-01",
      min_passengers: "1",
      max_passengers: "6",
      min_distance: "0",
      max_distance: "50",
      min_fare: "0",
      max_fare: "200",
    });
    fetchData(defaults.toString());
  };

  const mapCenter = useMemo(() => [40.7128, -73.95] as [number, number], []);

  return (
    <div className="w-full p-4 md:p-6 flex flex-col space-y-4 bg-gray-50">
      {/* Header - Stack on very small screens, row on sm up */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col space-y-1">
          <h1 className="text-2xl md:text-3xl font-medium">
            Urban Mobility Data Explorer
          </h1>
          <p className="text-black/50 text-sm md:text-base">
            NYC TLC • Jan 2019
          </p>
        </div>
        <div className="flex flex-col space-y-1 sm:text-right">
          <h2 className="text-xl md:text-2xl font-medium text-black/80">
            Contributors
          </h2>
          <p className="text-black/50 text-xs md:text-sm">
            Prince, Eelaf, Peniel, Benjamin, Alek
          </p>
        </div>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex flex-row justify-between w-full h-full">
          <CardHeader className="p-4">
            <CardTitle className="text-xs md:text-sm font-normal text-black/50 whitespace-nowrap">
              Total Trips
            </CardTitle>
            <CardDescription className="text-black text-xl md:text-2xl lg:text-3xl font-semibold">
              {statsLoading ? "..." : stats.total_trips.toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center p-4">
            <span className="text-3xl md:text-4xl lg:text-5xl">🚖</span>
          </CardContent>
        </Card>
        <Card className="flex flex-row justify-between w-full h-full">
          <CardHeader className="p-4">
            <CardTitle className="text-xs md:text-sm font-normal text-black/50 whitespace-nowrap">
              Avg Fare
            </CardTitle>
            <CardDescription className="text-black text-xl md:text-2xl lg:text-3xl font-semibold">
              {statsLoading ? "..." : `$${stats.avg_fare}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center p-4">
            <span className="text-3xl md:text-4xl lg:text-5xl">💰</span>
          </CardContent>
        </Card>
        <Card className="flex flex-row justify-between w-full h-full">
          <CardHeader className="p-4">
            <CardTitle className="text-xs md:text-sm font-normal text-black/50 whitespace-nowrap">
              Best Pickup Borough
            </CardTitle>
            <CardDescription className="text-black text-xl md:text-2xl lg:text-3xl font-semibold">
              {statsLoading ? "..." : stats.best_borough}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center p-4">
            <span className="text-3xl md:text-4xl lg:text-5xl">📍</span>
          </CardContent>
        </Card>
        <Card className="flex flex-row justify-between w-full h-full">
          <CardHeader className="p-4">
            <CardTitle className="text-xs md:text-sm font-normal text-black/50 whitespace-nowrap">
              Peak Hour
            </CardTitle>
            <CardDescription className="text-black text-xl md:text-2xl lg:text-3xl font-semibold">
              {statsLoading ? "..." : stats.peak_hour}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center p-4">
            <span className="text-3xl md:text-4xl lg:text-5xl">⌚️</span>
          </CardContent>
        </Card>
      </div>

      {/* Main content - Flex column on mobile, row on large screens */}
      <div className="flex flex-col lg:flex-row gap-2">
        {/* Left column / Filters */}
        <Card className="w-full lg:max-w-xs xl:max-w-sm h-fit">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl font-medium">
              Filters
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-4 md:p-6">
            <form onSubmit={handleApplyFilters}>
              <FieldGroup className="space-y-4">
                <FieldSet>
                  <FieldGroup className="space-y-4">
                    <Field>
                      <FieldLabel htmlFor="pub">Pickup Borough</FieldLabel>
                      <Select
                        defaultValue={pub}
                        onValueChange={setPub}
                        value={pub}
                      >
                        <SelectTrigger id="pub">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="Any">Any</SelectItem>
                            {BOROUGHS.map((b) => (
                              <SelectItem key={b} value={b}>
                                {b}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="dob">Dropoff Borough</FieldLabel>
                      <Select
                        defaultValue={dob}
                        onValueChange={setDob}
                        value={dob}
                      >
                        <SelectTrigger id="dob">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="Any">Any</SelectItem>
                            {BOROUGHS.map((b) => (
                              <SelectItem key={b} value={b}>
                                {b}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="put">Pickup Time</FieldLabel>
                      <Input
                        type="time"
                        id="time-picker-optional"
                        step="1"
                        defaultValue={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="bg-background appearance-none"
                      />
                    </Field>
                    <Field className="w-full">
                      <FieldLabel htmlFor="date-picker-range">
                        Date Range
                      </FieldLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            id="date-picker-range"
                            className="w-full justify-start px-2.5 font-normal"
                          >
                            {date?.from ? (
                              date.to ? (
                                <>
                                  {format(date.from, "LLL dd, y")} –{" "}
                                  {format(date.to, "LLL dd, y")}
                                </>
                              ) : (
                                format(date.from, "LLL dd, y")
                              )
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="range"
                            defaultMonth={date?.from}
                            selected={date}
                            onSelect={setDate}
                            numberOfMonths={1}
                            disabled={(date) =>
                              date > new Date("2019-12-31") ||
                              date < new Date("2008-01-01")
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </Field>
                    <Field>
                      <div className="grid w-full gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <FieldLabel htmlFor="passengers">
                            Passengers
                          </FieldLabel>
                          <span className="text-muted-foreground text-xs md:text-sm">
                            {passengerCount.join("–")}
                          </span>
                        </div>
                        <Slider
                          id="passengers"
                          value={passengerCount}
                          onValueChange={setPassengerCount}
                          min={0}
                          max={9}
                          step={1}
                        />
                      </div>
                    </Field>
                    <Field>
                      <div className="grid w-full gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <FieldLabel htmlFor="tdistance">
                            Distance(km)
                          </FieldLabel>
                          <span className="text-muted-foreground text-xs md:text-sm">
                            {tdistance.join("–")}
                          </span>
                        </div>
                        <Slider
                          id="tdistance"
                          value={tdistance}
                          onValueChange={setTdistance}
                          min={0}
                          max={100}
                          step={1}
                        />
                      </div>
                    </Field>
                    <Field>
                      <div className="grid w-full gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <FieldLabel htmlFor="fare">Fare($)</FieldLabel>
                          <span className="text-muted-foreground text-xs md:text-sm">
                            {fare.join("–")}
                          </span>
                        </div>
                        <Slider
                          id="fare"
                          value={fare}
                          onValueChange={setFare}
                          min={0}
                          max={500}
                          step={5}
                        />
                      </div>
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter className="p-4 md:p-6 pt-0">
            <CardAction className="w-full flex justify-between gap-2">
              <Button
                className="flex-1"
                variant="secondary"
                onClick={handleReset}
              >
                Reset
              </Button>
              <Button className="flex-1" onClick={handleApplyFilters}>
                Apply
              </Button>
            </CardAction>
          </CardFooter>
        </Card>

        {/* Right column / Map & Table */}
        <div className="flex-1 flex flex-col space-y-4 min-w-0">
          <Card className="w-full overflow-hidden">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-lg md:text-xl font-medium">
                NYC Taxi Zones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 border-t">
              <div className="relative w-full h-[300px] md:h-[450px]">
                <MapContainer
                  center={mapCenter}
                  zoom={10}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  />
                  {geoData && (
                    <GeoJSON
                      key={geoJsonKey.current}
                      data={geoData}
                      style={boroughStyle}
                      onEachFeature={onEachZone}
                    />
                  )}
                </MapContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableCaption className="p-2 text-xs md:text-sm">
                  Showing {trips.length} records
                </TableCaption>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="whitespace-nowrap px-4 py-3">
                      No
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3">
                      Pickup Time
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3">
                      Dropoff Time
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3">
                      Pickup Borough
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3">
                      Dropoff Borough
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap px-4 py-3">
                      Distance(km)
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap px-4 py-3">
                      Passengers
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap px-4 py-3">
                      Fare($)
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap px-4 py-3">
                      Tip($)
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap px-4 py-3">
                      Total($)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10">
                        Loading trips...
                      </TableCell>
                    </TableRow>
                  ) : trips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10">
                        No trips found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    trips.map((trip) => (
                      <TableRow key={trip.no} className="hover:bg-gray-50/50">
                        <TableCell className="px-4 py-3 font-medium">
                          {trip.no}
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          {format(new Date(trip.pickup_time), "p")}
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap">
                          {format(new Date(trip.dropoff_time), "p")}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {trip.pickup_borough}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {trip.dropoff_borough}
                        </TableCell>
                        <TableCell className="text-center px-4 py-3">
                          {trip.distance.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-center px-4 py-3">
                          {trip.passengers}
                        </TableCell>
                        <TableCell className="text-center px-4 py-3">
                          {trip.fare.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center px-4 py-3">
                          {trip.tip.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center px-4 py-3 font-medium">
                          {trip.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
