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
	dev.w(60, param_A);
	dev.w(130, param_B);
	dev.w(131, param_C);
	dev.c(60);
	dev.c(200);
	p("(" + dev.r(60)+ " - " + dev.r(130)+ ")" + " / " + dev.r(131) + " = " + dev.r(210));
}

function study_ssm()
{
	var delay = 200;
	var Time_compare_param = Date.now(); 
	var LED_State_save = 0; // доп параметр, чтобы if внутри case не срабатывал по неск раз.
	
	p("Current state of LED - " + dev.r(211));
	p("Current state of SSM - " + dev.r(212));
	dev.c(62);

	while(dev.r(212) != 0)
	{
		switch (dev.r(212))
		{
			case 2:
				if (LED_State_save == 0)
				{
					LED_State_save = 1;
					Time_compare = Date.now();
				}
				break;
				
			case 3:
				if (dev.r(211) == 0 && LED_State_save == 1)
				{
					p("Время горения = " + (Date.now() - Time_compare));
					LED_State_save = 0;
					Time_compare = Date.now()
				}
				break;
			case 4:
			if (dev.r(211) == 1 && LED_State_save == 0)
				{
					p("Время гаснутое = " + (Date.now() - Time_compare));
					LED_State_save = 1;
					Time_compare = Date.now()
				}
				break;
		}
		//p("Current state of LED - " + dev.r(211));
		//p("Current state of SSM - " + dev.r(212));
		//sleep(delay);
	}
	
	p("Время горения = " + (Date.now() - Time_compare))
	p("Current state of LED - " + dev.r(211));
	p("Current state of SSM - " + dev.r(212));
}
