function Compare(csv_1C, csv_SL)
{
	var src_1C = Split(csv_1C);
	var src_SL = Split(csv_SL);
	
	var pr1 = SingleCompare(src_1C, src_SL);
	var pr2 = SingleCompare(src_SL, src_1C);
	
	var output = [];
	
	for (var i = 0; i < pr1.code.length; ++i)
		output.push(pr1.code[i] + ";" + pr1.description[i]);
	
	for (var i = 0; i < pr2.code.length; ++i)
		output.push(pr2.code[i] + ";" + pr2.description[i]);
	
	save("res.csv", output);
}

function Split(csv)
{
	var f = load(csv);
	
	var code = [];
	var num = [];
	
	for (var i = 0; i < (f.length / 2); ++i)
	{
		code[i] = f[i * 2];
		num[i]  = f[i * 2 + 1];
	}
	
	return {code:code, num:num};
}

function SingleCompare(master, slave)
{
	var problem_code = [];
	var problem_descr = [];
	
	for (var i = 0; i < master.code.length; ++i)
	{
		var code_found = false;
		
		for (var j = 0; j < slave.code.length; ++j)
		{
			if (master.code[i].localeCompare(slave.code[j]) == 0)
			{
				if (master.num[i].localeCompare(slave.num[j]) != 0)
				{
					problem_code.push(master.code[i]);
					problem_descr.push(master.num[i] + "_" + slave.num[j]);
				}
				
				code_found = true;
				break;
			}
		}
		
		if (!code_found)
		{
			problem_code.push(master.code[i]);
			problem_descr.push(master.num[i] + "_no_code");
		}
	}
	
	return {code:problem_code, description:problem_descr};
}
