port module Main exposing (main)

import Browser
import Html exposing (..)
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
    { categories : List Category
    , error : Maybe Error
    }


type alias Category =
    { name : String
    , count : Int
    }


emptyHistory =
    { categories = []
    , error = Nothing
    }


init : () -> ( Model, Cmd Msg )
init _ =
    ( emptyHistory, Cmd.none )


type Msg
    = GotHistoryMsg Value

categoriesDecoder : Decoder (List Category)
categoriesDecoder =
    Decode.list categoryDecoder

categoryDecoder : Decoder Category
categoryDecoder =
    Decode.map2 Category
        (Decode.field "name" Decode.string)
        (Decode.field "count" Decode.int)

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        GotHistoryMsg value ->
            case decodeValue categoriesDecoder value of
                Ok data ->
                    ( { model | categories = data }, Cmd.none )

                Err error ->
                    ( { model | error = Just error }, Cmd.none )


subscriptions : Model -> Sub Msg
subscriptions _ =
    onHistoryChange GotHistoryMsg


port onHistoryChange : (Value -> msg) -> Sub msg


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
            viewHistory model.categories


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


viewHistory : List Category -> Html Msg
viewHistory categories =
    ul []
        (List.map viewCategory categories)


viewCategory : Category -> Html Msg
viewCategory category =
    div []
        [ div [] [ text category.name ]
        , div [] [ text (String.fromInt category.count) ]
        ]
