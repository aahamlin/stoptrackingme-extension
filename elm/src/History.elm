module History exposing (..)

import Array exposing (Array)
import Dict exposing (Dict)

import Json.Decode as Decode exposing (Decoder, Error(..), Value, decodeValue)
import Json.Decode.Extra exposing (dict2)
import Time exposing (millisToPosix)
import DateFormat exposing (..)

--import Json.Decode.Pipeline exposing (required)
--import Json.Encode as Encode exposing (Value)

{- Daily series of event counts. Keyed from start of day, epoch timestamp
-}
type alias HistoryModel =
    Dict Int (Array Int)

mergeHistory : HistoryModel -> HistoryModel -> HistoryModel
mergeHistory old new =
    Dict.merge
        (\key a -> Dict.insert key a)
        (\key a b -> Dict.insert key b)
        (\key b -> Dict.insert key b)
        old
        new
        Dict.empty


historyDecoder : Decoder HistoryModel
historyDecoder =
    dict2 Decode.int seriesDecoder


seriesDecoder : Decoder (Array Int)
seriesDecoder =
    Decode.array Decode.int

dateFormat : Time.Zone -> Time.Posix -> String
dateFormat zone =
    format [ dayOfMonthFixed
           , text " "
           , monthNameAbbreviated
           ] zone

dateLongFormat : Time.Zone -> Time.Posix -> String
dateLongFormat zone =
    format [ dayOfWeekNameAbbreviated
           , text " "
           , dayOfMonthFixed
           , text " "
           , monthNameAbbreviated
           , text " "
           , yearNumber
           ] zone
