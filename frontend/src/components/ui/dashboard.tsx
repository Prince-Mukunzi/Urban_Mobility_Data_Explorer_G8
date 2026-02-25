import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Calendar } from "./calendar";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
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
import { type DateRange } from "react-day-picker";
import { Separator } from "./separator";
import {
  Table,
  TableBody,
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
import { toast } from "sonner";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";

interface Trip {
  no: string;
  pickup_time: string;
  dropoff_time: string;
  pickup_zone: string;
  dropoff_zone: string;
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
  best_zone: string;
  peak_hour: string;
}

// Colors used to visually distinguish different boroughs on our interactive map
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

// Assign our custom colors and map styles to each neighborhood depending on which borough it belongs to
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

// Show a tooltip with the neighborhood name and bold the boundaries when the user's mouse hovers over it
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

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:3000/api";

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  searchPlaceholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel =
    value === "Any"
      ? placeholder
      : options.find((o) => o === value) || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] md:w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="Any"
                onSelect={() => {
                  onChange("Any");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === "Any" ? "opacity-100" : "opacity-0"
                  )}
                />
                Any
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(value === option ? "Any" : option);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function Dashboard() {
  // Keep track of all our filter settings in state
  const [puz, setPuz] = useState("Any");
  const [doz, setDoz] = useState("Any");
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2019, 0, 1),
    to: new Date(2019, 0, 1),
  });
  const [passengerCount, setPassengerCount] = useState([1, 6]);
  const [tdistance, setTdistance] = useState([0, 50]);
  const [fare, setFare] = useState([0, 200]);
  const [pickupTime, setPickupTime] = useState("");
  const [dropoffTime, setDropoffTime] = useState("");
  const [page, setPage] = useState(1);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total_trips: 0,
    avg_fare: 0,
    avg_distance: 0,
    avg_tip_pct: 0,
    best_zone: "-",
    peak_hour: "-",
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Hold onto the map neighborhood data we get from the backend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [geoData, setGeoData] = useState<any>(null);
  const geoJsonKey = useRef(0);

  // Extract all unique zones from the map data so we can list them in our dropdowns
  const { zoneOptions } = useMemo(() => {
    if (!geoData) return { zoneOptions: [] };
    const zSet = new Set<string>();
    geoData.features.forEach((f: any) => {
      const z = f.properties?.zone;
      if (z && z !== "Unknown") zSet.add(z);
    });
    return {
      zoneOptions: Array.from(zSet).sort(),
    };
  }, [geoData]);

  // Fetch the map boundaries once when the dashboard first loads
  useEffect(() => {
    fetch(`${API}/zones`)
      .then((r) => r.json())
      .then((data) => {
        setGeoData(data);
        geoJsonKey.current += 1;
      })
      .catch(console.error);
  }, []);

  // Turn all our filter variables into a proper URL query string that the backend understands
  const buildParams = useCallback(
    (overridePage?: number) => {
      const params = new URLSearchParams();
      if (puz && puz !== "Any") params.append("pickup_zone", puz);
      if (doz && doz !== "Any") params.append("dropoff_zone", doz);
      if (date?.from)
        params.append("date_from", format(date.from, "yyyy-MM-dd"));
      if (date?.to) params.append("date_to", format(date.to, "yyyy-MM-dd"));
      params.append("min_passengers", passengerCount[0].toString());
      params.append("max_passengers", passengerCount[1].toString());
      params.append("min_distance", tdistance[0].toString());
      params.append("max_distance", tdistance[1].toString());
      params.append("min_fare", fare[0].toString());
      params.append("max_fare", fare[1].toString());
      if (pickupTime) {
        const hour = parseInt(pickupTime.split(":")[0], 10);
        if (!isNaN(hour)) params.append("pickup_hour", hour.toString());
      }
      if (dropoffTime) {
        const hour = parseInt(dropoffTime.split(":")[0], 10);
        if (!isNaN(hour)) params.append("dropoff_hour", hour.toString());
      }
      params.append("page", (overridePage ?? page).toString());
      return params.toString();
    },
    [
      puz,
      doz,
      date,
      passengerCount,
      tdistance,
      fare,
      pickupTime,
      dropoffTime,
      page,
    ]
  );

  // Talk to the backend to get the latest trips and stats based on what filters are active
  const fetchData = useCallback(
    async (qs?: string) => {
      const query = qs ?? buildParams();

      // Cancel any ongoing requests before starting a new one so we don't get mixed up data
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setStatsLoading(true);

      const toastId = toast.loading("Fetching data...");

      Promise.all([
        fetch(`${API}/trips?${query}`, { signal: controller.signal }).then(
          async (res) => {
            if (!res.ok) throw new Error("Failed to fetch trips");
            return res.json();
          }
        ),
        fetch(`${API}/stats?${query}`, { signal: controller.signal }).then(
          async (res) => {
            if (!res.ok) throw new Error("Failed to fetch stats");
            return res.json();
          }
        ),
      ])
        .then(([tripsData, statsData]) => {
          setTrips(tripsData.trips);
          setStats(statsData);
          toast.success("Dashboard updated successfully", { id: toastId });
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error(err);
            toast.error(err.message || "Failed to fetch data", { id: toastId });
          } else {
            toast.dismiss(toastId);
          }
        })
        .finally(() => {
          setLoading(false);
          setStatsLoading(false);
        });
    },
    [buildParams]
  );

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData(buildParams(1));
  };

  // Put all filters back to their default starting values
  const handleReset = () => {
    setPuz("Any");
    setDoz("Any");
    setDate({ from: new Date(2019, 0, 1), to: new Date(2019, 0, 1) });
    setPassengerCount([1, 6]);
    setTdistance([0, 50]);
    setFare([0, 200]);
    setPage(1);
    setPickupTime("");
    setDropoffTime("");

    const defaults = new URLSearchParams({
      date_from: "2019-01-01",
      date_to: "2019-01-01",
      min_passengers: "1",
      max_passengers: "6",
      min_distance: "0",
      max_distance: "50",
      min_fare: "0",
      max_fare: "200",
      page: "1",
    });
    fetchData(defaults.toString());
  };

  const mapCenter = useMemo(() => [40.7128, -73.95] as [number, number], []);

  return (
    <div className="w-full p-4 md:p-6 flex flex-col space-y-4 bg-gray-50">
      {/* The header section that stacks vertically on phones, but sits side-by-side on larger screens */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col space-y-1">
          <h1 className="text-2xl md:text-3xl font-medium">
            NYC TLC • 2008 – 2019
          </h1>
          <p className="text-black/50 text-sm md:text-base">
            Urban Mobility Data Explorer
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

      {/* Top statistics cards showing our main metrics. They adjust from 1 to 4 columns depending on screen size */}
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
              Best Pickup Zone
            </CardTitle>
            <CardDescription
              className="text-black text-xl md:text-2xl lg:text-3xl font-semibold text-nowrap"
              title={stats.best_zone}
            >
              {statsLoading ? "..." : stats.best_zone}
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
            <CardDescription className="text-black text-xl md:text-2xl lg:text-3xl font-semibold text-nowrap">
              {statsLoading ? "..." : stats.peak_hour}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center p-4">
            <span className="text-3xl md:text-4xl lg:text-5xl">⌚️</span>
          </CardContent>
        </Card>
      </div>

      {/* This contains the filters and the map/table area. They sit side-by-side on desktop but stack on mobile */}
      <div className="flex flex-col lg:flex-row gap-2">
        {/* The filter sidebar where users can narrow down trips by time, location, passengers, and cost */}
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
                      <FieldLabel htmlFor="puz">Pickup Zone</FieldLabel>
                      <SearchableSelect
                        options={zoneOptions}
                        value={puz}
                        onChange={setPuz}
                        placeholder="Any"
                        searchPlaceholder="Search zone..."
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="doz">Dropoff Zone</FieldLabel>
                      <SearchableSelect
                        options={zoneOptions}
                        value={doz}
                        onChange={setDoz}
                        placeholder="Any"
                        searchPlaceholder="Search zone..."
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="put">Pickup Time</FieldLabel>
                      <Input
                        type="time"
                        id="put"
                        step="1"
                        defaultValue={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="bg-background appearance-none"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="dot">Dropoff Time</FieldLabel>
                      <Input
                        type="time"
                        id="dot"
                        step="1"
                        defaultValue={dropoffTime}
                        onChange={(e) => setDropoffTime(e.target.value)}
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

        {/* The main data visualization area showing the interactive map on top and the data table below */}
        <div className="flex-1 flex flex-col space-y-4 min-w-0">
          <Card className="w-full overflow-hidden">
            <CardHeader>
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

          <Card className="w-full overflow-hidden py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-secondary">
                  <TableRow className="text-center">
                    <TableHead>Pickup Time</TableHead>
                    <TableHead>Dropoff Time</TableHead>
                    <TableHead>Pickup Zone</TableHead>
                    <TableHead>Dropoff Zone</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Fare</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Total</TableHead>
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
                    trips.map((trip, idx) => (
                      <TableRow key={`${trip.no}-${idx}`}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(trip.pickup_time), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(trip.dropoff_time), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell title={trip.pickup_zone}>
                          {trip.pickup_zone}
                        </TableCell>
                        <TableCell title={trip.dropoff_zone}>
                          {trip.dropoff_zone}
                        </TableCell>
                        <TableCell>{trip.distance.toFixed(1)}</TableCell>
                        <TableCell>{trip.fare.toFixed(2)}</TableCell>
                        <TableCell>{trip.tip.toFixed(2)}</TableCell>
                        <TableCell className="font-medium">
                          {trip.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between p-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  setPage(newPage);
                  fetchData(buildParams(newPage));
                }}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <div className="text-sm font-medium">Page {page}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newPage = page + 1;
                  setPage(newPage);
                  fetchData(buildParams(newPage));
                }}
                disabled={trips.length < 15}
              >
                Next
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
