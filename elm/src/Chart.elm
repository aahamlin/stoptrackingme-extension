module Chart exposing (SeriesModel, samples, chart, createSeries)

import Array exposing (Array)
import Axis
import Color exposing (Color)
import Dict
import History exposing (HistoryModel, dateFormat)
import List.Extra as List
import Scale exposing (BandConfig, BandScale, ContinuousScale, defaultBandConfig)
import Scale.Color
import Shape exposing (StackConfig, StackResult)
import Time exposing (millisToPosix)
import TypedSvg exposing (g, rect, svg, text_)
import TypedSvg.Attributes exposing (class, fill, transform, viewBox, dominantBaseline, textAnchor)
import TypedSvg.Attributes.InPx exposing (height, width, x, y)
import TypedSvg.Core exposing (Svg, text)
import TypedSvg.Types exposing (Paint(..), Transform(..), DominantBaseline(..), AnchorAlignment(..))


chart : { history : HistoryModel, timeZone : Time.Zone } -> Svg msg
chart model =
    let
        -- need to generate empty series for days missing from history, using history.todayMillis
        dataSeries =
            createSeries model.history
    in
    view model.timeZone dataSeries (Shape.stack (config dataSeries))


w : Float
w =
    720


h : Float
h =
    300

padding : Float
padding =
    30

offset : Float
offset =
    120

reverseViridis : Float -> Color
reverseViridis progression =
    Scale.Color.viridisInterpolator (1 - progression)


colors : Int -> List Color
colors size =
    let
        colorScale =
            Scale.sequential reverseViridis ( 0, toFloat size - 1 )
                |> Scale.convert
    in
    List.range 0 (size - 1)
        |> List.map (colorScale << toFloat)


column : BandScale Time.Posix -> ( Time.Posix, List ( Float, Float ) ) -> Svg msg
column scale ( date, values ) =
    let
        block color ( upperY, lowerY ) =
            rect
                [ x <| Scale.convert scale date
                , y <| lowerY
                , width <| Scale.bandwidth scale
                , height <| (abs <| upperY - lowerY)
                , fill <| Paint color
                ]
                []
    in
    g [ class [ "column" ] ] (List.map2 block (colors (List.length values)) values)


view : Time.Zone -> List SeriesModel -> StackResult String -> Svg msg
view timeZone dataSeries { values, labels, extent } =
    let
        dayValues =
            List.transpose values

        days =
            List.map .posixDate dataSeries

        xScale : BandScale Time.Posix
        xScale =
            Scale.band { defaultBandConfig | paddingInner = 0.1, paddingOuter = 0.2 } ( 0, w - (2 * padding) - offset  ) days

        yScale : ContinuousScale Float
        yScale =
            Scale.linear ( h - 2 * padding, 0 ) extent
                |> Scale.nice 4

        scaledValues =
            List.map (List.map (\( y1, y2 ) -> ( Scale.convert yScale y1, Scale.convert yScale y2 ))) dayValues

    in
    svg [ viewBox 0 0 w h ]
        [ g [ transform [ Translate (padding - 1) (h - padding) ] ]
            [ Axis.bottom [ Axis.tickCount 10 ] (Scale.toRenderable (dateFormat timeZone) xScale) ]
        , g [ transform [ Translate (padding - 1) padding ] ]
            [ Axis.left [] yScale ]
        , g [ transform [ Translate padding padding ], class [ "series" ] ] <|
            List.map (column xScale) (List.map2 (\a b -> ( a, b )) days scaledValues)
        , g [ transform [ Translate (w - offset) padding ], class [ "legend" ] ] <|
            List.indexedMap drawLegend <| List.map2 (\color label -> (label, color)) (colors (List.length labels)) labels
        ]

drawLegend : Int -> (String, Color) -> Svg msg
drawLegend index (name, color) =
    g []
    [ rect [ x -20
           , y <| toFloat index * 20
           , width 20
           , height 20
           , transform [ Translate offset 0 ]
           , fill (Paint color) ]
          []
    , text_ [ x -25
            , y <| toFloat index * 20
            , dominantBaseline DominantBaselineHanging
            , transform [ Translate offset 2 ]
            , textAnchor AnchorEnd
            , fill (Paint Color.black)
            ]
          [ text name ]
    ]

samples : List SeriesModel -> List (String, List Float)
samples dataSeries =
    -- limit to 7 days
    List.map (\{ label, accessor } -> ( label, List.map (toFloat << accessor) dataSeries )) series


config : List SeriesModel -> StackConfig String
config dataSeries =
    { data = samples dataSeries
    , offset = Shape.stackOffsetNone
    , order =
        List.sortBy Tuple.first
    }


series : List { label : String, accessor : SeriesModel -> Int }
series =
    [ { label = "Cookies"
      , accessor = .cookies
      }
    , { label = "Advertising"
      , accessor = .advertising
      }
    , { label = "Analytics"
      , accessor = .analytics
      }
    , { label = "Content"
      , accessor = .content
      }
    , { label = "Cryptomining"
      , accessor = .cryptomining
      }
    , { label = "Social"
      , accessor = .social
      }
    , { label = "Fingerprinting"
      , accessor = .fingerprinting
      }
    ]


type alias SeriesModel =
    { posixDate : Time.Posix
    , cookies : Int
    , advertising : Int
    , analytics : Int
    , content : Int
    , cryptomining : Int
    , social : Int
    , fingerprinting : Int
    }


createSeries : HistoryModel -> List SeriesModel
createSeries history =
    List.reverse <|
        List.take 7 <|
            Dict.foldl buildSeries [] history

buildSeries : Int -> Array Int -> List SeriesModel -> List SeriesModel
buildSeries key values accumulatedSeries =
    let
        posix =
            millisToPosix key

        cookies =
            Maybe.withDefault 0 (Array.get 0 values)

        advertising =
            Maybe.withDefault 0 (Array.get 1 values)

        analytics =
            Maybe.withDefault 0 (Array.get 2 values)

        content =
            Maybe.withDefault 0 (Array.get 3 values)

        cryptomining =
            Maybe.withDefault 0 (Array.get 4 values)

        social =
            Maybe.withDefault 0 (Array.get 5 values)

        fingerprinting =
            Maybe.withDefault 0 (Array.get 6 values)
    in
    SeriesModel posix cookies advertising analytics content cryptomining social fingerprinting :: accumulatedSeries
