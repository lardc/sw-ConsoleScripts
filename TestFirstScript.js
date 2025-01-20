function test_script()
{
	var ResultArray= [];
	var FirstTestNumber = 1;
	var LastTestNumber = 100;
	
	//поиск элементов
	for (var i = FirstTestNumber; i <= LastTestNumber; i++)
	{
		if((i%3 == 0) || (i%5 == 0))
		{
			ResultArray.push(i);
		}
	}

	var StringOutput= ResultArray.toString();

	p(StringOutput);
	pl(ResultArray);
	save('Test_script_result.txt', StringOutput);
}

function study_abc_calc(port,param_A,param_B,param_C)
{
	dev.co(port);
	dev.w(60,param_A);
	dev.w(130,param_B);
	dev.w(131,param_C);
	dev.c(60);
	dev.c(200);
	p("("+dev.r(60)+"-"+dev.r(130)+")"+"/"+dev.r(131)+"="+dev.r(210));
}