module Example exposing (..)

import Expect exposing (Expectation)
import Fuzz exposing (Fuzzer, int, list, string)
import Test exposing (..)

import Json.Decode as Decode
import Time exposing (millisToPosix)
import History exposing (..)
import Chart exposing (SeriesModel, createSeries)

-- type alias Model =
--     { history : List CategoryTotal
--     , error : Maybe Error
--     }

suite : Test
suite =
    describe "historyDecoder"
        [ test "decode" <|
            \_ ->
                """{"1592366400000":[1,2,3]}"""
                    |> Decode.decodeString historyDecoder
                    |> Expect.ok
        , test "create series" <|
            \_ ->
                let
                    posix =
                        millisToPosix 1592366400000

                    series =
                        let
                            result =
                                """{"1592366400000":[1,2,3]}"""
                                    |> Decode.decodeString historyDecoder
                        in
                        case result of
                            Ok history ->
                                createSeries history

                            Err _ ->
                                []
                in
                List.head series
                    |> Expect.equal (Just (SeriesModel posix 1 2 3 0 0 0 0))
        , test "create list from ASC dict keys" <|
            \_ ->
                let
                    posix =
                        millisToPosix 1592366400000

                    series =
                        let
                            result =
                                """{"1592366400000":[1,2,3],"1592452800000":[5,8,2],"1592539200000":[7,3,9]}"""
                                    |> Decode.decodeString historyDecoder
                        in
                        case result of
                            Ok history ->
                                createSeries history

                            Err _ ->
                                []
                in
                List.head series
                    |> Expect.equal (Just (SeriesModel posix 1 2 3 0 0 0 0)) -- oldest value is first
        , test "create list from DESC dict keys" <|
            \_ ->
                let
                    posix =
                        millisToPosix 1592366400000

                    series =
                        let
                            result =
                                """{"1592539200000":[1,2,3],"1592452800000":[5,8,2],"1592366400000":[7,3,9]}"""
                                    |> Decode.decodeString historyDecoder
                        in
                        case result of
                            Ok history ->
                                createSeries history

                            Err _ ->
                                []
                in
                List.head series
                    |> Expect.equal (Just (SeriesModel posix 7 3 9 0 0 0 0)) -- oldest value is first
        , test "create series of last 7 days" <|
            \_ ->
                let
                    posix =
                        millisToPosix 1592366400000

                    series =
                        let
                            result =
                                """{"1592884800000":[0,0,0],"1592798400000":[1,1,3],"1592712000000":[0,0,0],"1592625600000":[0,0,0],"1592539200000":[1,2,3],"1592452800000":[5,8,2],"1592366400000":[7,3,9],"1592280000000":[0,0,0]}"""
                                    |> Decode.decodeString historyDecoder
                        in
                        case result of
                            Ok history ->
                                createSeries history
                            Err _ ->
                                []
                in
                List.head series
                    |> Expect.equal (Just (SeriesModel posix 7 3 9 0 0 0 0)) -- oldest value is first, limited to 7 values
        ]
