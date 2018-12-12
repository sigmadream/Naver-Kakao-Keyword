const got = require('got');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const schedule = require('node-schedule');

mongoose.connect('mongodb://localhost:27017/keyword', { useNewUrlParser: true });

const PortalKeywordSchema = new mongoose.Schema({
    portal: String,
    createdAt: String,
	keywords: Array,
});

const PortalKeyword = mongoose.model('PortalKeyword', PortalKeywordSchema);

schedule.scheduleJob('*/10 * * * * *', async function () {
	try {
		let naverKeywords = [];
		let daumKeywords = [];

		const result = await Promise.all([
			got('https://naver.com'),
			got('http://daum.net'),
		]);

		const createdAt = new Date().toISOString();

		const naverContent = result[0].body;
		const daumContent = result[1].body;
		const $naver = cheerio.load(naverContent);
		const $daum = cheerio.load(daumContent);

		// Get doms containing latest keywords
		$naver('.ah_l').filter((i, el) => {
			return i===0;
		}).find('.ah_item').each(((i, el) => {
			if(i >= 20) return;
			const keyword = $naver(el).find('.ah_k').text();
			naverKeywords.push({rank: i+1, keyword});
		}));
		$daum('.rank_cont').find('.link_issue[tabindex=-1]').each((i, el) => {
			const keyword = $daum(el).text();
			daumKeywords.push({rank: i+1, keyword});
		});

		console.log({
			naver: naverKeywords,
			daum: daumKeywords,
		});

		await new PortalKeyword({
			portal: 'naver',
			createdAt,
			keywords: naverKeywords
		}).save();

		await new PortalKeyword({
			portal: 'daum',
			createdAt,
			keywords: daumKeywords
		}).save();
	} catch (err) {
		console.log(err);
	}
});
