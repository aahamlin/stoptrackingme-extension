port module Main exposing (main)

import Array
import Browser
import Chart exposing (chart)
import Dict exposing (Dict)
import History exposing (..)
import Html exposing (Html, div, footer, h1, h2, h3, img, ol, p, span, table, tbody, td, text, th, thead, tr, ul)
import Html.Attributes exposing (class, src)
import Json.Decode as Decode exposing (Decoder, Error(..), Value, decodeValue)
import Json.Decode.Extra exposing (dict2)
import Task
import Time exposing (millisToPosix, posixToMillis)


main : Program () Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


type alias Model =
    { history : HistoryModel
    , todayKey : Int
    , timeZone : Time.Zone
    , error : Maybe Error
    }


emptyHistory : Model
emptyHistory =
    { history = Dict.empty
    , todayKey = 0
    , timeZone = Time.utc
    , error = Nothing
    }


init : () -> ( Model, Cmd Msg )
init _ =
    ( emptyHistory, Task.perform GotCurrentTimeMsg Time.now )


type Msg
    = GotHistoryMsg Value
    | GotCurrentTimeMsg Time.Posix



--    | GotTimeZoneMsg Time.Zone


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        GotHistoryMsg value ->
            case decodeValue historyDecoder value of
                Ok data ->
                    ( { model | history = mergeHistory model.history data }, Cmd.none )

                Err error ->
                    ( { model | error = Just error }, Cmd.none )

        GotCurrentTimeMsg now ->
            let
                key =
                    floor (toFloat (posixToMillis now) / 86400000) * 86400000

                history =
                    emptyWeekFrom key
            in
            ( { model | todayKey = key, history = history }, Cmd.none )



-- GotTimeZoneMsg zone ->
--     ( { model | timeZone = zone }, Cmd.none )


subscriptions : Model -> Sub Msg
subscriptions _ =
    onHistoryChange GotHistoryMsg


port onHistoryChange : (Value -> msg) -> Sub msg


emptyWeekFrom : Int -> HistoryModel
emptyWeekFrom key =
    Dict.fromList
        [ ( key, Array.initialize 7 (always 0) )
        , ( key - 86400000, Array.initialize 7 (always 0) )
        , ( key - (2 * 86400000), Array.initialize 7 (always 0) )
        , ( key - (3 * 86400000), Array.initialize 7 (always 0) )
        , ( key - (4 * 86400000), Array.initialize 7 (always 0) )
        , ( key - (5 * 86400000), Array.initialize 7 (always 0) )
        , ( key - (6 * 86400000), Array.initialize 7 (always 0) )
        ]



-- VIEW


view : Model -> Html Msg
view model =
    div []
        [ viewHeader
        , viewHistoryOrError model
        , viewFooter model
        ]

viewHeader : Html Msg
viewHeader =
    div [ class "header" ]
        [ img [ class "logo", src "icons/logo64x64.png" ] []
        , h1 [] [ text "Stop Tracking Me" ]
        --, h2 [] [ text "Recent tracking activity" ]
        ]

viewFooter : Model -> Html Msg
viewFooter m =
    let
        dateStr =
            dateLongFormat m.timeZone (millisToPosix m.todayKey)
    in
    footer [] [ text ("Days recorded in UTC. Today is " ++ dateStr ++ ".") ]


viewHistoryOrError : Model -> Html Msg
viewHistoryOrError model =
    case model.error of
        Just error ->
            viewError error

        Nothing ->
            viewHistory model


viewError : Error -> Html Msg
viewError error =
    let
        errorHeading =
            "Failed to read event history"

        errorMessage =
            case error of
                Failure message _ ->
                    message

                _ ->
                    "Invalid JSON"
    in
    div []
        [ h3 [] [ text errorHeading ]
        , p [] [ text ("Error: " ++ errorMessage) ]
        ]


viewHistory : Model -> Html Msg
viewHistory m =
    div []
        [ div [ class "container" ] [ chart { history = m.history, timeZone = m.timeZone } ]
        , div [ class "container" ] [ drawDataTable m ]
        , p [] [ text "Displaying all tracking activity blocked by category over past 7 days." ]
        ]


drawDataTable : Model -> Html Msg
drawDataTable m =
    let
        header =
            List.map (\key -> th [] [ text (dateFormat m.timeZone (millisToPosix key)) ]) <|
                Dict.keys m.history

        row =
            List.map (\arr -> td [] [ text (String.fromInt (List.sum <| Array.toList arr)) ]) <|
                Dict.values m.history
    in
    table [ class "datatable" ]
        [ thead []
            [ tr [] <|
                th [] [ text "Date" ]
                    :: header
            ]
        , tbody []
            [ tr [] <|
                th [] [ text "Total" ]
                    :: row
            ]
        ]
