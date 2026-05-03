// routes/api.js — все API-эндпоинты (все 10 запросов из БД)
const express = require('express');
const router = express.Router();
const { sql, query } = require('../db');

// ── ЗАПРОС 1: Общая статистика платформы ─────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                (SELECT COUNT(*) FROM Users) AS TotalUsers,
                (SELECT COUNT(*) FROM Skins) AS TotalSkins,
                (SELECT COUNT(*) FROM Listings WHERE Status = 'Active') AS ActiveListings,
                (SELECT COUNT(*) FROM Trades WHERE TradeStatus = 'Completed') AS CompletedTrades,
                (SELECT ISNULL(SUM(FinalPrice), 0) FROM Trades WHERE TradeStatus = 'Completed') AS TotalVolume
        `);
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('stats error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── ЗАПРОС 2: Топ 5 самых дорогих активных объявлений ────────────────────────
router.get('/top-listings', async (req, res) => {
    try {
        const result = await query(`
            SELECT TOP 5 L.ListingID, S.SkinName, S.WeaponName, S.Quality, 
                         L.Price, U.Username AS SellerName
            FROM Listings L
            JOIN Skins S ON L.SkinID = S.SkinID
            JOIN Users U ON L.SellerID = U.UserID
            WHERE L.Status = 'Active'
            ORDER BY L.Price DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('top-listings error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── ЗАПРОС 3: Топ 5 пользователей по количеству сделок ───────────────────────
router.get('/top-users', async (req, res) => {
    try {
        const result = await query(`
            SELECT TOP 5 U.UserID, U.Username, U.TotalTrades, U.Balance,
                (SELECT COUNT(*) FROM Listings WHERE SellerID = U.UserID AND Status = 'Active') AS ActiveListings
            FROM Users U ORDER BY U.TotalTrades DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('top-users error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── ЗАПРОС 4: Статистика продаж по категориям ────────────────────────────────
router.get('/categories', async (req, res) => {
    try {
        const result = await query(`
            SELECT C.CategoryName,
                COUNT(T.TradeID) AS SalesCount,
                ISNULL(SUM(T.FinalPrice), 0) AS TotalRevenue,
                ISNULL(AVG(T.FinalPrice), 0) AS AvgPrice
            FROM SkinCategories C
            LEFT JOIN Skins S ON C.CategoryID = S.CategoryID
            LEFT JOIN Listings L ON S.SkinID = L.SkinID
            LEFT JOIN Trades T ON L.ListingID = T.ListingID AND T.TradeStatus = 'Completed'
            GROUP BY C.CategoryID, C.CategoryName
            ORDER BY TotalRevenue DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('categories error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── ЗАПРОС 5: Статистика по качеству скинов ──────────────────────────────────
router.get('/quality-stats', async (req, res) => {
    try {
        const result = await query(`
            SELECT S.Quality,
                COUNT(DISTINCT S.SkinID) AS TotalSkins,
                COUNT(T.TradeID) AS SalesCount,
                ISNULL(AVG(T.FinalPrice), 0) AS AvgSalePrice
            FROM Skins S
            LEFT JOIN Listings L ON S.SkinID = L.SkinID
            LEFT JOIN Trades T ON L.ListingID = T.ListingID AND T.TradeStatus = 'Completed'
            WHERE S.Quality IS NOT NULL
            GROUP BY S.Quality
            ORDER BY AvgSalePrice DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('quality-stats error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── ЗАПРОС 6: Динамика продаж за 14 дней ─────────────────────────────────────
router.get('/sales-dynamics', async (req, res) => {
    try {
        const result = await query(`
            SELECT CAST(T.TradeDate AS DATE) AS TradeDay,
                COUNT(T.TradeID) AS SalesCount,
                SUM(T.FinalPrice) AS DailyRevenue
            FROM Trades T
            WHERE T.TradeStatus = 'Completed' AND T.TradeDate >= DATEADD(day, -14, GETDATE())
            GROUP BY CAST(T.TradeDate AS DATE)
            ORDER BY TradeDay ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('sales-dynamics error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── ЗАПРОС 7: Пользователи с балансом выше среднего ──────────────────────────
router.get('/rich-users', async (req, res) => {
    try {
        const result = await query(`
            DECLARE @AvgBalance DECIMAL(12,2);
            SELECT @AvgBalance = AVG(Balance) FROM Users;
            SELECT UserID, Username, Balance, TotalTrades, 
                   Balance - @AvgBalance AS DifferenceFromAvg
            FROM Users WHERE Balance > @AvgBalance ORDER BY Balance DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('rich-users error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── ЗАПРОС 8: Самые популярные скины ─────────────────────────────────────────
router.get('/popular-skins', async (req, res) => {
    try {
        const result = await query(`
            SELECT TOP 5 S.SkinName, S.WeaponName, S.Quality,
                COUNT(T.TradeID) AS TimesSold,
                AVG(T.FinalPrice) AS AvgSoldPrice
            FROM Skins S
            JOIN Listings L ON S.SkinID = L.SkinID
            JOIN Trades T ON L.ListingID = T.ListingID
            WHERE T.TradeStatus = 'Completed'
            GROUP BY S.SkinID, S.SkinName, S.WeaponName, S.Quality, S.MarketPrice
            ORDER BY TimesSold DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('popular-skins error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── ЗАПРОС 9: Детальная информация по пользователям ──────────────────────────
router.get('/users-detail', async (req, res) => {
    try {
        const result = await query(`
            SELECT U.UserID, U.Username, U.Balance, U.TotalTrades,
                dbo.fn_GetUserInventoryValue(U.UserID) AS InventoryValue,
                dbo.fn_GetUserActiveListingsCount(U.UserID) AS ActiveListings,
                dbo.fn_GetUserAvgTradePrice(U.UserID, 1) AS AvgSalePrice
            FROM Users U 
            ORDER BY (dbo.fn_GetUserInventoryValue(U.UserID) + U.Balance) DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('users-detail error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── ЗАПРОС 10: Полная информация по активным объявлениям ─────────────────────
router.get('/listings', async (req, res) => {
    try {
        // Параметры фильтрации
        const { quality, minPrice, maxPrice, search, sort } = req.query;

        let whereExtra = '';
        const params = {};

        if (quality && quality !== 'all') {
            whereExtra += ` AND S.Quality = @quality`;
            params.quality = { type: sql.NVarChar, value: quality };
        }
        if (minPrice) {
            whereExtra += ` AND L.Price >= @minPrice`;
            params.minPrice = { type: sql.Decimal(18,2), value: parseFloat(minPrice) };
        }
        if (maxPrice) {
            whereExtra += ` AND L.Price <= @maxPrice`;
            params.maxPrice = { type: sql.Decimal(18,2), value: parseFloat(maxPrice) };
        }
        if (search) {
            whereExtra += ` AND (S.SkinName LIKE @search OR S.WeaponName LIKE @search)`;
            params.search = { type: sql.NVarChar, value: `%${search}%` };
        }

        const orderMap = {
            'price_asc': 'L.Price ASC',
            'price_desc': 'L.Price DESC',
            'wear': 'S.FloatValue ASC',
            'name': 'S.SkinName ASC',
        };
        const orderBy = orderMap[sort] || 'L.Price DESC';

        const result = await query(`
            SELECT L.ListingID, S.SkinName, S.WeaponName, S.Quality, S.FloatValue,
                CASE 
                    WHEN S.FloatValue < 0.07 THEN 'Excellent'
                    WHEN S.FloatValue < 0.15 THEN 'Good'
                    WHEN S.FloatValue < 0.38 THEN 'Average'
                    ELSE 'Poor'
                END AS WearRating,
                L.Price, U.Username AS SellerName,
                CASE 
                    WHEN L.Price <= S.MarketPrice * 0.9 THEN 'Below Market'
                    WHEN L.Price >= S.MarketPrice * 1.1 THEN 'Above Market'
                    ELSE 'Market Price'
                END AS PriceRating,
                S.MarketPrice
            FROM Listings L
            JOIN Skins S ON L.SkinID = S.SkinID
            JOIN Users U ON L.SellerID = U.UserID
            WHERE L.Status = 'Active' ${whereExtra}
            ORDER BY ${orderBy}
        `, params);
        res.json(result.recordset);
    } catch (err) {
        console.error('listings error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
