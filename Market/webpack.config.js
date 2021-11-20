const path = require('path');
const MergeIntoSingleFilePlugin = require('webpack-merge-and-include-globally');

module.exports = {
	entry: './src/main.js',
	output: {
		filename: '[name]',
		path: path.resolve(__dirname, 'dist'),
	},
	plugins: [
		new MergeIntoSingleFilePlugin({
			files: {
				'LD.market.js': [
					'src/Header.js',
					'src/libs/FirebaseCore.js',
					'src/libs/FirebaseFirestore.js',
					'src/Firebase.js',
					'src/Settings.js',
					'src/Messages.js',
					'src/Sender.js',
					'src/Math.js',
					'src/ItemChecks.js',
					'src/Item.js',
					'src/main.js',
				],
			},
		}, null),
	],
};
