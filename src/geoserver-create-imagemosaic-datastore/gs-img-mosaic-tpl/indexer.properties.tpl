Schema=*the_geom:Polygon,location:String,ts:java.util.Date
PropertyCollectors=TimestampFileNameExtractorSPI[timeregex](ts)
TimeAttribute=ts
Recursive=false
CanBeEmpty=true
Wildcard=*.tif
