/**
 * Seed Script
 * Run: npm run seed
 * Populates the DB with all gifts from Variety.jsx
 */

require('dotenv').config({ path: './.env' });
const mongoose   = require('mongoose');
const connectDB  = require('../config/db');
const Gift       = require('../models/Gifts');
const User       = require('../models/User');

// ── All gifts mirrored from Variety.jsx ─────────────────────
const gifts = [
    // Birthday
    { giftId:'B-001', category:'birthday', name:'Designer Truffle Cake', imgUrl: "/images/Tuffle.jpg", price:{amount:899,display:'₹899'}, tag:'Bestseller', rating:{average:4.9,count:120}, details:['Rich chocolate truffle layers','Custom message topping','Same day available','Made fresh daily'], description:'An indulgent designer truffle cake crafted fresh for your celebration. Rich layers of premium chocolate make every bite memorable.' },
    { giftId:'B-002', category:'birthday', name:'Rose & Lily Bouquet', imgUrl: "/images/Rose Lily.webp", price:{amount:1199,display:'₹1,199'}, tag:'Fresh Daily', rating:{average:4.7,count:88}, details:['Fresh cut roses & lilies','Hand-tied with satin ribbon','Personalised card','Lasts 3–5 days'], description:'A breathtaking hand-tied bouquet of fresh roses and lilies, delivered same day to make any birthday extra special.' },
    { giftId:'B-003', category:'birthday', name:'Handmade Scrapbook', imgUrl: "/images/recipe scrapbook idea diy.webp", price:{amount:1499,display:'₹1,499'}, tag:'Personalized', rating:{average:4.8,count:65}, details:['Handcrafted pages','Custom photo insert','Vintage design','Gift-ready packaging'], description:'A beautifully handcrafted scrapbook personalised with your favourite memories. A keepsake they will treasure forever.' },
    { giftId:'B-004', category:'birthday', name:'Birthday Surprise Box', imgUrl: "/images/Box.webp", price:{amount:2499,display:'₹2,499'}, tag:'Top Pick', rating:{average:5.0,count:203}, details:['Curated gift items','Luxury box packaging','Personalised note','Free same-day delivery'], description:'The ultimate birthday surprise box — curated with love and packed with premium goodies to make the day unforgettable.' },

    // Anniversary
    { giftId:'A-001', category:'anniversary', name:'Chocolate Luxury Box', imgUrl: "/images/download.webp", price:{amount:1299,display:'₹1,299'}, tag:'Luxury', rating:{average:4.8,count:175}, details:['Premium cocoa','Handcrafted','Assorted flavours','Elegant packaging'], description:'An exquisite assortment of handcrafted chocolates presented in a luxury gift box — perfect for anniversaries.' },
    { giftId:'A-002', category:'anniversary', name:'PhotoFrame', imgUrl: "/images/photoFrame.webp", price:{amount:1299,display:'₹1,299'}, tag:'Frame', rating:{average:4.8,count:90}, details:['Custom photo print','Premium frame','Ready to hang','Gift boxed'], description:'Preserve a cherished memory in this premium personalised photo frame — a timeless anniversary keepsake.' },
    { giftId:'A-003', category:'anniversary', name:'Food Basket', imgUrl: "/images/FoodBasket.webp", price:{amount:899,display:'₹899'}, tag:'Food', rating:{average:4.9,count:60}, details:['Artisan snacks','Premium chocolates','Gourmet items','Wicker basket'], description:'A beautifully arranged gourmet food basket filled with artisan snacks and premium treats to celebrate your love.' },
    { giftId:'A-004', category:'anniversary', name:'LED Photo Frame', imgUrl: "/images/LED Frame.webp", price:{amount:899,display:'₹899'}, tag:'Trending', rating:{average:4.9,count:140}, details:['Energy-efficient LED','Acrylic frame','USB powered','Custom photo insert'], description:'Illuminate cherished memories with this sleek LED photo frame — a modern and heartfelt anniversary gift.' },

    // Baby Shower
    { giftId:'BS-001', category:'baby-shower', name:'Organic Cotton Baby Dress', imgUrl: "/images/baby dress.jpg", price:{amount:1499,display:'₹1,499'}, tag:'Organic', rating:{average:4.8,count:55}, details:['100% Organic Cotton','Soft and breathable','Elegant design','Machine washable'], description:'A beautiful organic cotton dress for your little one — soft, breathable, and gentle on delicate baby skin.' },
    { giftId:'BS-002', category:'baby-shower', name:'Soft Plush Elephant Toy', imgUrl: "/images/Soft Plush Elephant Toy for Babies.jpg", price:{amount:799,display:'₹799'}, tag:'Soft & Safe', rating:{average:4.9,count:110}, details:['Super soft plush','Hypoallergenic','Child-safe eyes','Perfect for snuggling'], description:'A cuddly hypoallergenic plush elephant — perfect for newborns and toddlers, safe and irresistibly soft.' },
    { giftId:'BS-003', category:'baby-shower', name:'Educational Wooden Toy Set', imgUrl: "/images/Wooden toy.jpg", price:{amount:1299,display:'₹1,299'}, tag:'Eco-Friendly', rating:{average:4.7,count:48}, details:['Eco-friendly wood','Non-toxic paint','Sustainably sourced','Supports motor skills'], description:'High-quality eco-friendly wooden toys designed to stimulate cognitive development and safe, imaginative play.' },
    { giftId:'BS-004', category:'baby-shower', name:'Baby Basket', imgUrl: "/images/baby basket.jpg", price:{amount:1299,display:'₹1,299'}, tag:'Eco-Friendly', rating:{average:4.7,count:72}, details:['Curated baby essentials','Soft cotton items','Keepsake basket','Ready to gift'], description:'A thoughtfully curated baby basket filled with essential soft items — the perfect baby shower gift.' },

    // Groom To Be
    { giftId:'G-001', category:'groom-to-be', name:"Premium Men's Perfume", imgUrl: "/images/perfume.webp", price:{amount:2499,display:'₹2,499'}, tag:'Premium', rating:{average:4.8,count:95}, details:['Long-lasting fragrance','Luxury glass bottle','Woody & Citrus notes','Ideal for formal occasions'], description:'A sophisticated fragrance for the modern groom — deep woody notes with a hint of fresh citrus.' },
    { giftId:'G-002', category:'groom-to-be', name:'Classic White Dress Shirt', imgUrl: "/images/white shirt.jpg", price:{amount:1899,display:'₹1,899'}, tag:'Tailored', rating:{average:4.7,count:80}, details:['100% Egyptian Cotton','Easy-iron finish','Slim fit design','Classic collar'], description:'A perfectly tailored Egyptian cotton dress shirt — the cornerstone of every groom\'s wedding ensemble.' },
    { giftId:'G-003', category:'groom-to-be', name:'Formal Slim Fit Pants', imgUrl: "/images/fomal pant.jpg", price:{amount:2199,display:'₹2,199'}, tag:'Elegant', rating:{average:4.6,count:62}, details:['Stretchable fabric','Slim fit','Premium wool blend','Hidden waistband'], description:'Elegant slim-fit formal trousers offering a sharp silhouette — perfect for weddings and celebrations.' },
    { giftId:'G-004', category:'groom-to-be', name:'Grooming Kit', imgUrl: "/images/kit.jpg", price:{amount:2199,display:'₹2,199'}, tag:'Elegant', rating:{average:4.6,count:50}, details:['Complete grooming set','Premium accessories','Luxury pouch','Travel friendly'], description:'A complete premium grooming kit to help the groom-to-be look his absolute best on the big day.' },

    // Bride To Be
    { giftId:'BR-001', category:'bride-to-be', name:'Bridal Hamper', imgUrl: "/images/hamper.jpg", price:{amount:4299,display:'₹4,299'}, tag:'Pro Grade', rating:{average:4.7,count:88}, details:['Curated bridal essentials','Luxury packaging','Personalised ribbon','Premium brands'], description:'A luxurious bridal hamper filled with premium essentials to pamper the bride-to-be before her big day.' },
    { giftId:'BR-002', category:'bride-to-be', name:'Luxury Bridal Suit', imgUrl: "/images/suit.jpg", price:{amount:12999,display:'₹12,999'}, tag:'Royal', rating:{average:4.9,count:145}, details:['Pure Banarasi Silk','Handcrafted embroidery','Custom tailored fit','Includes matching dupatta'], description:'An exquisite bridal suit crafted from pure silk with intricate hand-embroidery — royalty for the modern bride.' },
    { giftId:'BR-003', category:'bride-to-be', name:'Premium Jewelry Set', imgUrl: "/images/jewellery set.jpg", price:{amount:8499,display:'₹8,499'}, tag:'Handcrafted', rating:{average:4.8,count:120}, details:['Gold plated brass','Kundan & Meenakari work','Handcrafted in Jaipur','Adjustable chain length'], description:'A stunning Jaipur-crafted jewellery set — necklace, earrings, and maang tikka plated in 22K gold.' },
    { giftId:'BR-004', category:'bride-to-be', name:'Bridal Makeup Kit', imgUrl: "/images/bridal makeup kit.jpg", price:{amount:4299,display:'₹4,299'}, tag:'Pro Grade', rating:{average:4.7,count:98}, details:['International brands','Long-wear formulas','Cruelty-free products','Professional grade quality'], description:'A curated high-end makeup kit to help the bride look flawless — long-lasting, cruelty-free formulas.' },

    // Wedding
    { giftId:'W-001', category:'wedding', name:'Exotic Fruit Basket', imgUrl: "/images/Fruit Basket.jpg", price:{amount:2199,display:'₹2,199'}, tag:'Fresh', rating:{average:4.8,count:70}, details:['Seasonal exotic fruits','Premium wicker basket','Personalised card','Same-day delivery'], description:'A beautifully arranged basket of seasonal exotic fruits — a fresh and elegant wedding gift.' },
    { giftId:'W-002', category:'wedding', name:'Premium Wedding Bouquet', imgUrl: "/images/premium wedding Bouquet.webp", price:{amount:3499,display:'₹3,499'}, tag:'Royal', rating:{average:4.9,count:155}, details:['Exotic flower varieties','Hand-tied arrangement','Satin ribbon','Long-lasting freshness'], description:'A royal hand-tied bouquet of exotic blooms — the perfect floral statement for any wedding celebration.' },
    { giftId:'W-003', category:'wedding', name:'Luxury Lifafa (Envelope Set)', imgUrl: "/images/lifafa.jpg", price:{amount:499,display:'₹499'}, tag:'Traditional', rating:{average:4.7,count:200}, details:['Set of 10 envelopes','Premium card stock','Gold foil design','Traditional motifs'], description:'Elegant gold-foil envelopes with traditional Rajasthani motifs — a meaningful and traditional wedding gift.' },
    { giftId:'W-004', category:'wedding', name:'Chocolate Gift Bouquet', imgUrl: "/images/choclatebouquet.webp", price:{amount:499,display:'₹499'}, tag:'Traditional', rating:{average:4.7,count:130}, details:['Assorted chocolates','Bouquet arrangement','Gift wrapped','Personalised note'], description:'A unique and delightful chocolate bouquet — a sweet and creative gift for any wedding occasion.' },

    // Appreciation
    { giftId:'AP-001', category:'appreciation', name:'Gratitude Pen Set', imgUrl: "/images/pen.jpg", price:{amount:1299,display:'₹1,299'}, tag:'Premium', rating:{average:4.8,count:85}, details:['Premium metal pens','Personalised engraving','Luxury box','Ideal for professionals'], description:'A sophisticated premium pen set with personalised engraving — an elegant way to say thank you.' },
    { giftId:'AP-002', category:'appreciation', name:'Scented Peace Box', imgUrl: "/images/Enjoy.webp", price:{amount:999,display:'₹999'}, tag:'Relaxing', rating:{average:4.7,count:75}, details:['Aromatic candles','Essential oils','Calming scents','Gift-ready box'], description:'A curated relaxation box filled with scented candles and essential oils — a peaceful gift of gratitude.' },
    { giftId:'AP-003', category:'appreciation', name:'Thank You Bouquet', imgUrl: "/images/apprication.webp", price:{amount:999,display:'₹999'}, tag:'Flower', rating:{average:4.7,count:60}, details:['Fresh seasonal blooms','Personalised card','Same-day delivery','Hand-tied'], description:'A fresh, vibrant bouquet paired with a heartfelt card — the classic way to show appreciation.' },
    { giftId:'AP-004', category:'appreciation', name:'Premium Water Bottle', imgUrl: "/images/Bottle.jpg", price:{amount:999,display:'₹999'}, tag:'Bottle', rating:{average:4.7,count:45}, details:['Stainless steel','Double-wall insulated','Custom engraving','BPA-free'], description:'A premium insulated stainless steel bottle with custom engraving — a thoughtful and practical gift.' },

    // Friendship
    { giftId:'F-001', category:'friendship', name:'Bestie Memory Frame', imgUrl: "/images/bestieFrame.jpg", price:{amount:799,display:'₹799'}, tag:'Personalized', rating:{average:4.9,count:160}, details:['Custom photo print','Premium frame','Ready to hang','Gift boxed'], description:'A personalised memory frame celebrating your friendship — a heartfelt gift they will display forever.' },
    { giftId:'F-002', category:'friendship', name:'Infinity Bond Charms', imgUrl: "/images/Charm.jpg", price:{amount:1599,display:'₹1,599'}, tag:'Silver', rating:{average:4.8,count:95}, details:['Silver-plated charms','Matching pair','Velvet pouch','Friendship symbol'], description:'A beautiful pair of matching silver-plated infinity charms — a symbol of a bond that never ends.' },
    { giftId:'F-003', category:'friendship', name:'Vision Board', imgUrl: "/images/vision board.webp", price:{amount:1599,display:'₹1,599'}, tag:'Board', rating:{average:4.8,count:40}, details:['Premium cork board','Decorative elements','Custom quotes','Ready to frame'], description:'A creative vision board kit to help your bestie dream big — a unique and inspiring friendship gift.' },
    { giftId:'F-004', category:'friendship', name:'Bestie Card Set', imgUrl: "/images/bestie Card.jpg", price:{amount:1599,display:'₹1,599'}, tag:'Card', rating:{average:4.8,count:55}, details:['Set of 5 cards','Handcrafted design','Envelopes included','Premium paper stock'], description:'A set of beautifully designed handcrafted friendship cards — each one a little love letter to your bestie.' },
];

const seed = async () => {
    await connectDB();

    const uniqueGifts = Array.from(
        new Map(gifts.map(gift => [gift.giftId, gift])).values()
    );
    if (uniqueGifts.length !== gifts.length) {
        const seen = new Set();
        const duplicateIds = gifts
            .map(gift => gift.giftId)
            .filter(id => (seen.has(id) ? true : (seen.add(id), false)));
        console.warn(`⚠️  Removed duplicate gift IDs from seed: ${[...new Set(duplicateIds)].join(', ')}`);
    }

    // Clear existing gifts
    await Gift.deleteMany({});
    console.log('🗑️  Cleared existing gifts');

    // Insert all gifts
    await Gift.insertMany(uniqueGifts);
    console.log(`🎁 Seeded ${uniqueGifts.length} gifts`);

    // Create a default admin user (if none exists)
    const existingAdmin = await User.findOne({ email: 'admin@jaipurgifts.com' });
    if (!existingAdmin) {
        await User.create({
            name: 'Admin',
            email: 'admin@jaipurgifts.com',
            password: 'Admin@1234',  // Change this immediately after first login!
            role: 'admin',
        });
        console.log('👤 Admin user created: admin@jaipurgifts.com / Admin@1234');
    } else {
        console.log('👤 Admin user already exists, skipping.');
    }

    console.log('✅ Seeding complete!');
    process.exit(0);
};

seed().catch(err => {
    console.error('❌ Seed error:', err);
    process.exit(1);
});
