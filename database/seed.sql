-- =========================================================
-- Vehicle Rental Management System - Seed Data DML Script
-- Passwords:
-- Admin (admin@vehiclerent.com): admin123
-- Customers (john.doe@gmail.com / sarah.smith@yahoo.com): customer123
-- =========================================================

USE `vehicle_rental_db`;

-- Seed Users
INSERT INTO `users` (`id`, `email`, `password_hash`, `role`) VALUES
(1, 'admin@vehiclerent.com', '$2a$10$RG15cnzezxi8/vnautyKVuZoBQl361bAZDwpgXMfiAiwe5SD/V30i', 'admin'),
(2, 'john.doe@gmail.com', '$2a$10$zhjEM2zD4iRpLDofvL/0DOeWzeXsHD87.IsGeAaxJ1cWIPPMzg9YS', 'customer'),
(3, 'sarah.smith@yahoo.com', '$2a$10$zhjEM2zD4iRpLDofvL/0DOeWzeXsHD87.IsGeAaxJ1cWIPPMzg9YS', 'customer')
ON DUPLICATE KEY UPDATE `password_hash`=VALUES(`password_hash`);

-- Seed Customers
INSERT INTO `customers` (`id`, `user_id`, `first_name`, `last_name`, `phone`, `driver_license`, `address`) VALUES
(1, 2, 'John', 'Doe', '555-0192', 'DL-987654321', '123 Main Street, Suite 400, New York, NY'),
(2, 3, 'Sarah', 'Smith', '555-0144', 'DL-123456789', '742 Evergreen Terrace, Springfield, IL')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Categories
INSERT INTO `vehicle_categories` (`id`, `name`, `description`, `daily_rate`, `image_url`) VALUES
(1, 'Luxury Sedan', 'Executive luxury sedans with premium leather interiors and smooth rides.', 95.00, 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800'),
(2, 'Full-size SUV', 'Spacious 7-seater SUVs equipped for family trips and off-road capability.', 120.00, 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800'),
(3, 'Electric / EV', 'Eco-friendly high performance electric vehicles with fast charging.', 110.00, 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800'),
(4, 'Economy Hatchback', 'Fuel-efficient compact cars perfect for city commuting and quick trips.', 45.00, 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800'),
(5, 'Convertible Sports', 'High performance open-top sports cars for stylish weekend getaways.', 150.00, 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?w=800')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Vehicles
INSERT INTO `vehicles` (`id`, `category_id`, `make`, `model`, `year`, `license_plate`, `color`, `seating_capacity`, `fuel_type`, `transmission`, `status`, `image_url`) VALUES
(1, 1, 'BMW', '5 Series 530i', 2023, 'NYC-5301', 'Black Sapphire', 5, 'Gasoline', 'Automatic', 'available', 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800'),
(2, 1, 'Mercedes-Benz', 'E-Class E350', 2024, 'BENZ-889', 'Obsidian Black', 5, 'Gasoline', 'Automatic', 'available', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800'),
(3, 2, 'Toyota', 'Land Cruiser V8', 2023, 'SUV-7700', 'Pearl White', 7, 'Gasoline', 'Automatic', 'rented', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800'),
(4, 3, 'Tesla', 'Model S Plaid', 2024, 'EV-1000', 'Midnight Silver', 5, 'Electric', 'Automatic', 'available', 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800'),
(5, 4, 'Honda', 'Civic EX', 2022, 'HON-4321', 'Sonic Gray', 5, 'Gasoline', 'Automatic', 'available', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800'),
(6, 5, 'Porsche', '911 Carrera Cabriolet', 2023, 'POR-9111', 'Guards Red', 2, 'Gasoline', 'Automatic', 'maintenance', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Rentals
INSERT INTO `rentals` (`id`, `customer_id`, `vehicle_id`, `start_date`, `end_date`, `total_days`, `total_cost`, `status`) VALUES
(1, 1, 3, CURRENT_DATE(), DATE_ADD(CURRENT_DATE(), INTERVAL 3 DAY), 3, 360.00, 'active'),
(2, 2, 1, DATE_SUB(CURRENT_DATE(), INTERVAL 10 DAY), DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY), 3, 285.00, 'completed')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Payments
INSERT INTO `payments` (`id`, `rental_id`, `amount`, `payment_method`, `payment_status`) VALUES
(1, 1, 360.00, 'card_on_delivery', 'paid'),
(2, 2, 285.00, 'card_on_delivery', 'paid')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Reviews
INSERT INTO `reviews` (`id`, `customer_id`, `vehicle_id`, `rating`, `comment`) VALUES
(1, 2, 1, 5, 'Sensational driving experience! The BMW 5 Series was spotless, fast, and smooth.')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Employees
INSERT INTO `employees` (`id`, `user_id`, `first_name`, `last_name`, `position`, `phone`, `hired_date`) VALUES
(1, 1, 'Admin', 'Manager', 'Fleet Director', '555-0100', '2023-01-15')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Seed Contact Messages
INSERT INTO `contact_messages` (`id`, `name`, `email`, `subject`, `message`, `status`) VALUES
(1, 'John Doe', 'john.doe@gmail.com', 'Inquiry about long-term Tesla rental', 'Hello, do you offer discounts for rentals longer than 2 weeks?', 'unread')
ON DUPLICATE KEY UPDATE `id`=`id`;
