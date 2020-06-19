port module Main exposing (main)

import Browser
import Dict exposing (Dict)
import Html exposing (Html, div, h3, ol, p, span, text, ul)
import Json.Decode as Decode exposing (Decoder, Error(..), Value, decodeValue)


main : Program () Model Msg
main =
    Browser.element
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        }


type alias Model =
    { history : Dict String DailyCountPerCategory
    , error : Maybe Error
    }


type alias DailyCountPerCategory =
    Dict String Int


historyDecoder : Decoder (Dict String DailyCountPerCategory)
historyDecoder =
    Decode.dict categoriesDecoder


categoriesDecoder : Decoder (Dict String Int)
categoriesDecoder =
    Decode.dict Decode.int


mergeHistory : Dict String DailyCountPerCategory -> Dict String DailyCountPerCategory -> Dict String DailyCountPerCategory
mergeHistory old new =
    Dict.merge
        (\key a -> Dict.insert key a)
        (\key a b -> Dict.insert key (mergeDailyCount a b))
        (\key b -> Dict.insert key b)
        old
        new
        Dict.empty


mergeDailyCount : Dict String Int -> Dict String Int -> Dict String Int
mergeDailyCount old new =
    Dict.merge
        (\key a -> Dict.insert key a)
        (\key a b -> Dict.insert key b) -- daily counts are always a total, so take new value
        (\key b -> Dict.insert key b)
        old
        new
        Dict.empty


emptyHistory : Model
emptyHistory =
    { history = Dict.empty
    , error = Nothing
    }


init : () -> ( Model, Cmd Msg )
init _ =
    ( emptyHistory, Cmd.none )


type Msg
    = GotHistoryMsg Value


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        GotHistoryMsg value ->
            case decodeValue historyDecoder value of
                Ok data ->
                    ( { model | history = mergeHistory model.history data }, Cmd.none )

                Err error ->
                    ( { model | error = Just error }, Cmd.none )


subscriptions : Model -> Sub Msg
subscriptions _ =
    onHistoryChange GotHistoryMsg


port onHistoryChange : (Value -> msg) -> Sub msg



-- VIEW


view : Model -> Html Msg
view model =
    div []
        [ p [] [ text "History" ]
        , viewHistoryOrError model
        ]


viewHistoryOrError : Model -> Html Msg
viewHistoryOrError model =
    case model.error of
        Just error ->
            viewError error

        Nothing ->
            viewHistory model.history


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
                    "Error: invalid JSON"
    in
    div []
        [ h3 [] [ text errorHeading ]
        , text ("Error: " ++ errorMessage)
        ]


viewHistory : Dict String DailyCountPerCategory -> Html Msg
viewHistory days =
    ul []
        (List.map viewDailyCount (Dict.toList days))


viewDailyCount : ( String, DailyCountPerCategory ) -> Html Msg
viewDailyCount ( day, categories ) =
    div []
        [ p [] [ text day ]
        , ol []
            (List.map viewCategory (Dict.toList categories))
        ]


viewCategory : ( String, Int ) -> Html Msg
viewCategory ( name, count ) =
    div []
        [ div []
            [ span [] [ text name ]
            , span [] [ text (String.fromInt count) ]
            ]
        ]
