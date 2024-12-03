import { Layer, LayerProps, Source } from "react-map-gl/maplibre";
import { FeatureCollection } from "geojson";

export const ResultsSourceLayer: React.FC<{
  results: FeatureCollection;
}> = ({ results }) => {
  const firstFeaturesType = results.features[0].geometry.type;
  const textLayerStyle: LayerProps | undefined =
    firstFeaturesType === "LineString"
      ? ({
          "text-anchor": "center",
          "symbol-placement": "line-center",
        } as unknown as LayerProps)
      : undefined;

  return (
    <>
      <Source type="geojson" data={results}>
        <Layer
          id={"results-fill"}
          type="fill"
          paint={{ "fill-color": "red", "fill-opacity": 0.5 }}
        />
        <Layer
          id={"results-name"}
          type="symbol"
          layout={{
            "text-field": ["format", ["get", "name"], { "font-scale": 1.2 }],
            "text-size": 16,
            "text-offset": [0, -1.5],
            ...textLayerStyle,
          }}
        />
        <Layer
          id={"results-value"}
          type="symbol"
          layout={{
            "text-field": ["format", ["get", "value"], { "font-scale": 1.2 }],
            "text-size": 14,
            "text-offset": [0, 1.5],
            ...textLayerStyle,
          }}
        />
      </Source>
    </>
  );
};
