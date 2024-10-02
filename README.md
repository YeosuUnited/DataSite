<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premier League Standings</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f8f9fa;
            margin: 0;
            padding: 0;
        }

        .table-container {
            max-width: 1000px;
            margin: 50px auto;
            padding: 20px;
            background-color: white;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }

        h1 {
            text-align: center;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            padding: 10px;
            text-align: center;
            border: 1px solid #ddd;
        }

        th {
            background-color: #343a40;
            color: white;
        }

        td {
            background-color: #fff;
        }

        .team-name {
            text-align: left;
        }

        tr:nth-child(even) td {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>

<div class="table-container">
    <h1>Premier League Standings (2024-25)</h1>
    <table>
        <thead>
        <tr>
            <th>Position</th>
            <th>Team</th>
            <th>Matches Played</th>
            <th>Wins</th>
            <th>Draws</th>
            <th>Losses</th>
            <th>Goals For</th>
            <th>Goals Against</th>
            <th>Goal Difference</th>
            <th>Points</th>
        </tr>
        </thead>
        <tbody>
        <tr>
            <td>1</td>
            <td class="team-name">Liverpool FC</td>
            <td>6</td>
            <td>5</td>
            <td>0</td>
            <td>1</td>
            <td>12</td>
            <td>2</td>
            <td>10</td>
            <td>15</td>
        </tr>
        <tr>
            <td>2</td>
            <td class="team-name">Manchester City FC</td>
            <td>6</td>
            <td>4</td>
            <td>2</td>
            <td>0</td>
            <td>14</td>
            <td>6</td>
            <td>8</td>
            <td>14</td>
        </tr>
        <!-- 나머지 팀 추가 -->
        </tbody>
    </table>
</div>

</body>
</html>
